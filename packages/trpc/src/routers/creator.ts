import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import type { Prisma } from '@repo/db';
import { router, protectedProcedure, creatorProcedure, publicProcedure, rateLimit, requireFeature } from '../trpc';
import { AGE_BAND_SET, GENDER_SET } from '../constants';
import {
  usernameSchema,
  profileFieldsSchema,
  socialAccountSchema,
  portfolioItemSchema,
} from '../schemas';

// Concrete shapes for the JSON columns. Casting to these at the procedure
// boundary keeps the tRPC output type finite — the raw `Prisma.JsonValue` is
// recursive and tips the client's type inference into "excessively deep and
// possibly infinite" (breaks `next build`). See MVP-PUNCHLIST §2.7.
export type RatesMap = Record<string, { from: number; currency?: string }>;
export type AudienceCountry = { code: string; pct: number };
export type AudienceDistribution = Record<string, number>;

const PUBLIC_PROFILE_INCLUDE = {
  socialAccounts: {
    select: {
      id: true,
      platform: true,
      handle: true,
      followers: true,
      engagementRate: true,
      verified: true,
      audienceTopCountry: true,
      audienceCountries: true,
      audienceAges: true,
      audienceGender: true,
      audienceVerified: true,
      audienceSource: true,
    },
  },
  portfolio: {
    orderBy: { order: 'asc' } as const,
    select: { id: true, url: true, type: true, title: true, thumbnailUrl: true, order: true },
  },
  collaborations: { orderBy: { date: 'desc' } as const },
  user: { select: { name: true, avatar: true } },
} satisfies Prisma.CreatorProfileInclude;

type ProfileWithRelations = Prisma.CreatorProfileGetPayload<{
  include: typeof PUBLIC_PROFILE_INCLUDE;
}>;

/**
 * Cast the recursive JSON columns to concrete shapes so the tRPC output type
 * stays finite (raw `Prisma.JsonValue` is recursive and makes the client's type
 * inference "excessively deep and possibly infinite" — breaks `next build`).
 * Used by every procedure that returns the full profile shape. See §2.7.
 */
function serializeProfile(p: ProfileWithRelations) {
  return {
    ...p,
    rates: p.rates as RatesMap | null,
    socialAccounts: p.socialAccounts.map((a) => ({
      ...a,
      audienceCountries: a.audienceCountries as AudienceCountry[] | null,
      audienceAges: a.audienceAges as AudienceDistribution | null,
      audienceGender: a.audienceGender as AudienceDistribution | null,
    })),
  };
}

export const creatorRouter = router({
  getMine: creatorProcedure.query(async ({ ctx }) => {
    const profile = await ctx.db.creatorProfile.findUnique({
      where: { id: ctx.creatorId },
      include: PUBLIC_PROFILE_INCLUDE,
    });
    return profile ? serializeProfile(profile) : null;
  }),

  /**
   * Create-or-update. Creates the profile on first call (so it can't require
   * a pre-existing one). Username is immutable once set.
   */
  upsertProfile: protectedProcedure
    .input(profileFieldsSchema.extend({ username: usernameSchema }))
    .mutation(async ({ ctx, input }) => {
      const { username, ...fields } = input;
      const existing = await ctx.db.creatorProfile.findUnique({
        where: { userId: ctx.userId },
        select: { id: true, username: true },
      });

      if (existing) {
        if (username !== existing.username) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'El nombre de usuario no se puede cambiar',
          });
        }
        const updated = await ctx.db.creatorProfile.update({
          where: { id: existing.id },
          data: fields,
          include: PUBLIC_PROFILE_INCLUDE,
        });
        return serializeProfile(updated);
      }

      const taken = await ctx.db.creatorProfile.findUnique({
        where: { username },
        select: { id: true },
      });
      if (taken) {
        throw new TRPCError({ code: 'CONFLICT', message: 'Ese nombre de usuario ya existe' });
      }

      const created = await ctx.db.creatorProfile.create({
        data: { userId: ctx.userId!, username, ...fields },
        include: PUBLIC_PROFILE_INCLUDE,
      });
      return serializeProfile(created);
    }),

  addSocialAccount: creatorProcedure
    .input(socialAccountSchema)
    .mutation(async ({ ctx, input }) => {
      const dupe = await ctx.db.socialAccount.findUnique({
        where: { creatorId_platform: { creatorId: ctx.creatorId, platform: input.platform } },
        select: { id: true },
      });
      if (dupe) {
        throw new TRPCError({ code: 'CONFLICT', message: 'Ya agregaste esa plataforma' });
      }
      // recompute extension keeps maxFollowers/maxEngagement in sync
      return ctx.db.socialAccount.create({
        data: { ...input, creatorId: ctx.creatorId, verified: false, verificationSource: 'self_reported' },
      });
    }),

  updateSocialAccount: creatorProcedure
    .input(socialAccountSchema.extend({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const acct = await ctx.db.socialAccount.findUnique({ where: { id }, select: { creatorId: true } });
      if (!acct || acct.creatorId !== ctx.creatorId) {
        throw new TRPCError({ code: 'NOT_FOUND' });
      }
      // Editing self-reported metrics resets verification.
      return ctx.db.socialAccount.update({
        where: { id },
        data: { ...data, verified: false, verificationSource: 'self_reported', verifiedAt: null },
      });
    }),

  removeSocialAccount: creatorProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const acct = await ctx.db.socialAccount.findUnique({
        where: { id: input.id },
        select: { creatorId: true },
      });
      if (!acct || acct.creatorId !== ctx.creatorId) {
        throw new TRPCError({ code: 'NOT_FOUND' });
      }
      await ctx.db.socialAccount.delete({ where: { id: input.id } });
      return { ok: true };
    }),

  publish: creatorProcedure.mutation(async ({ ctx }) => {
    const profile = await ctx.db.creatorProfile.findUnique({
      where: { id: ctx.creatorId },
      include: { socialAccounts: { select: { id: true } } },
    });
    if (!profile) throw new TRPCError({ code: 'NOT_FOUND' });

    const missing: string[] = [];
    if (!profile.username) missing.push('username');
    if (profile.socialAccounts.length === 0) missing.push('socialAccount');
    if (profile.niches.length === 0) missing.push('niche');
    if (!profile.contentType) missing.push('contentType');
    if (missing.length > 0) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: `Faltan campos para publicar: ${missing.join(', ')}`,
      });
    }
    return ctx.db.creatorProfile.update({ where: { id: ctx.creatorId }, data: { published: true } });
  }),

  unpublish: creatorProcedure.mutation(async ({ ctx }) => {
    return ctx.db.creatorProfile.update({ where: { id: ctx.creatorId }, data: { published: false } });
  }),

  /**
   * Public profile by username. Visible only if published, OR to its owner
   * (so the creator can preview a draft). Rates public unless ratesPublic=false
   * (stripped server-side here — NOT in the shared include, so getMine keeps
   * them). viewCount is never exposed publicly.
   */
  getByUsername: publicProcedure
    .use(rateLimit({ key: 'getByUsername', limit: 60, windowMs: 60_000 }))
    .input(z.object({ username: usernameSchema }))
    .query(async ({ ctx, input }) => {
      const profile = await ctx.db.creatorProfile.findUnique({
        where: { username: input.username },
        include: PUBLIC_PROFILE_INCLUDE,
      });
      if (!profile) throw new TRPCError({ code: 'NOT_FOUND' });
      const isOwner = ctx.userId && profile.userId === ctx.userId;
      if (!profile.published && !isOwner) throw new TRPCError({ code: 'NOT_FOUND' });

      // Privacy: strip rates when hidden, and never leak the view counter.
      const { viewCount: _viewCount, ...rest } = serializeProfile(profile);
      return { ...rest, rates: profile.ratesPublic ? rest.rates : null };
    }),

  addPortfolioItem: creatorProcedure
    .input(portfolioItemSchema)
    .mutation(async ({ ctx, input }) => {
      const count = await ctx.db.portfolioItem.count({ where: { creatorId: ctx.creatorId } });
      return ctx.db.portfolioItem.create({
        data: { ...input, creatorId: ctx.creatorId, order: count },
      });
    }),

  removePortfolioItem: creatorProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const item = await ctx.db.portfolioItem.findUnique({
        where: { id: input.id },
        select: { creatorId: true },
      });
      if (!item || item.creatorId !== ctx.creatorId) throw new TRPCError({ code: 'NOT_FOUND' });
      await ctx.db.portfolioItem.delete({ where: { id: input.id } });
      return { ok: true };
    }),

  reorderPortfolio: creatorProcedure
    .input(z.object({ ids: z.array(z.string()) }))
    .mutation(async ({ ctx, input }) => {
      const owned = await ctx.db.portfolioItem.findMany({
        where: { creatorId: ctx.creatorId },
        select: { id: true },
      });
      const ownedSet = new Set(owned.map((o) => o.id));
      if (input.ids.length !== owned.length || !input.ids.every((id) => ownedSet.has(id))) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Lista de orden inválida' });
      }
      await ctx.db.$transaction(
        input.ids.map((id, order) =>
          ctx.db.portfolioItem.update({ where: { id }, data: { order } }),
        ),
      );
      return { ok: true };
    }),

  /** Self-declared per-account audience demographics. Editing resets verification. */
  setAudience: creatorProcedure
    .use(requireFeature('audienceData'))
    .input(
      z.object({
        socialAccountId: z.string(),
        topCountries: z.array(z.object({ code: z.string().length(2), pct: z.number().min(0).max(100) })).max(3),
        ages: z.record(z.string(), z.number().min(0).max(100)).optional(),
        gender: z
          .object({ female: z.number().min(0).max(100), male: z.number().min(0).max(100), other: z.number().min(0).max(100) })
          .partial()
          .optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const acct = await ctx.db.socialAccount.findUnique({
        where: { id: input.socialAccountId },
        select: { creatorId: true },
      });
      if (!acct || acct.creatorId !== ctx.creatorId) throw new TRPCError({ code: 'NOT_FOUND' });

      // validate keys against the controlled sets (loose: drop unknown)
      const ages = input.ages
        ? Object.fromEntries(Object.entries(input.ages).filter(([k]) => AGE_BAND_SET.has(k)))
        : undefined;
      const gender = input.gender
        ? Object.fromEntries(Object.entries(input.gender).filter(([k]) => GENDER_SET.has(k)))
        : undefined;
      const topCountries = input.topCountries.map((c) => ({ code: c.code.toUpperCase(), pct: c.pct }));

      return ctx.db.socialAccount.update({
        where: { id: input.socialAccountId },
        data: {
          audienceTopCountry: topCountries[0]?.code ?? null,
          audienceCountries: topCountries as Prisma.InputJsonValue,
          audienceAges: (ages ?? {}) as Prisma.InputJsonValue,
          audienceGender: (gender ?? {}) as Prisma.InputJsonValue,
          audienceSource: 'self_declared',
          audienceVerified: false,
          audienceVerifiedAt: null,
        },
      });
    }),

  /** Owner-excluded view increment. Dedupe is best-effort client-side; a
   * modest rate limit blunts trivial counter inflation. */
  recordView: publicProcedure
    .use(rateLimit({ key: 'recordView', limit: 10, windowMs: 60_000 }))
    .input(z.object({ username: usernameSchema }))
    .mutation(async ({ ctx, input }) => {
      const profile = await ctx.db.creatorProfile.findUnique({
        where: { username: input.username },
        select: { id: true, userId: true, published: true },
      });
      if (!profile || !profile.published) return { ok: true };
      if (ctx.userId === profile.userId) return { ok: true }; // owner — don't count
      await ctx.db.creatorProfile.update({
        where: { id: profile.id },
        data: { viewCount: { increment: 1 } },
      });
      return { ok: true };
    }),
});
