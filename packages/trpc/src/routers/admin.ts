import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, adminProcedure } from '../trpc';
import {
  usernameSchema,
  profileFieldsSchema,
  socialAccountSchema,
} from '../schemas';

export const adminRouter = router({
  /** Hand-seed a creator (cold-start inventory). */
  createCreatorProfile: adminProcedure
    .input(
      profileFieldsSchema.extend({
        email: z.string().email(),
        name: z.string().trim().max(120).optional(),
        username: usernameSchema,
        publish: z.boolean().default(false),
        socialAccounts: z.array(socialAccountSchema).default([]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { email, name, username, publish, socialAccounts, ...fields } = input;

      const taken = await ctx.db.creatorProfile.findUnique({
        where: { username },
        select: { id: true },
      });
      if (taken) throw new TRPCError({ code: 'CONFLICT', message: 'Username ya existe' });

      const user = await ctx.db.user.upsert({
        where: { email },
        update: { name: name ?? undefined },
        create: { email, name },
      });

      const profile = await ctx.db.creatorProfile.create({
        data: { userId: user.id, username, ...fields },
      });

      // Create accounts one-by-one so the recompute extension runs.
      for (const acct of socialAccounts) {
        await ctx.db.socialAccount.create({
          data: { ...acct, creatorId: profile.id, verified: false, verificationSource: 'self_reported' },
        });
      }

      if (publish && socialAccounts.length > 0 && (fields.niches?.length ?? 0) > 0 && fields.contentType) {
        await ctx.db.creatorProfile.update({ where: { id: profile.id }, data: { published: true } });
      }

      return ctx.db.creatorProfile.findUnique({
        where: { id: profile.id },
        include: { socialAccounts: true },
      });
    }),

  listUsers: adminProcedure
    .input(
      z
        .object({
          role: z.enum(['admin', 'creator', 'org_member', 'any']).default('any'),
          suspended: z.boolean().optional(),
          cursor: z.string().optional(),
          limit: z.number().int().min(1).max(100).default(50),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const limit = input?.limit ?? 50;
      const where: Record<string, unknown> = {};
      if (input?.suspended != null) where.suspended = input.suspended;
      if (input?.role === 'admin') where.isAdmin = true;
      else if (input?.role === 'creator') where.creatorProfile = { isNot: null };
      else if (input?.role === 'org_member') where.orgMemberships = { some: {} };

      const rows = await ctx.db.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit + 1,
        ...(input?.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
        select: {
          id: true,
          email: true,
          name: true,
          isAdmin: true,
          suspended: true,
          createdAt: true,
          creatorProfile: { select: { username: true, published: true } },
        },
      });
      const hasMore = rows.length > limit;
      const page = hasMore ? rows.slice(0, limit) : rows;
      return { items: page, nextCursor: hasMore ? page[page.length - 1].id : null };
    }),

  /** Suspend also unpublishes the creator's profile so the indexed search gate hides them (C4). */
  suspendUser: adminProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.$transaction(async (tx) => {
        const user = await tx.user.update({ where: { id: input.userId }, data: { suspended: true } });
        await tx.creatorProfile.updateMany({ where: { userId: input.userId }, data: { published: false } });
        return user;
      });
    }),

  unsuspendUser: adminProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.user.update({ where: { id: input.userId }, data: { suspended: false } });
    }),

  // Fetch a creator (incl. unpublished) with social-account ids, so admins can
  // verify accounts before a profile is public.
  getCreatorByUsername: adminProcedure
    .input(z.object({ username: z.string() }))
    .query(async ({ ctx, input }) => {
      const profile = await ctx.db.creatorProfile.findUnique({
        where: { username: input.username },
        select: {
          id: true,
          username: true,
          published: true,
          maxFollowers: true,
          socialAccounts: {
            select: { id: true, platform: true, handle: true, followers: true, verified: true, audienceVerified: true, audienceTopCountry: true },
          },
        },
      });
      if (!profile) throw new TRPCError({ code: 'NOT_FOUND' });
      return profile;
    }),

  verifySocialAccount: adminProcedure
    .input(z.object({ socialAccountId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.socialAccount.update({
        where: { id: input.socialAccountId },
        data: { verified: true, verificationSource: 'admin', verifiedAt: new Date() },
      });
    }),

  unverifySocialAccount: adminProcedure
    .input(z.object({ socialAccountId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.socialAccount.update({
        where: { id: input.socialAccountId },
        data: { verified: false, verificationSource: 'self_reported', verifiedAt: null },
      });
    }),

  verifyAudience: adminProcedure
    .input(z.object({ socialAccountId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.socialAccount.update({
        where: { id: input.socialAccountId },
        data: { audienceVerified: true, audienceSource: 'admin', audienceVerifiedAt: new Date() },
      });
    }),

  unverifyAudience: adminProcedure
    .input(z.object({ socialAccountId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.socialAccount.update({
        where: { id: input.socialAccountId },
        data: { audienceVerified: false, audienceSource: 'self_declared', audienceVerifiedAt: null },
      });
    }),

  listContacts: adminProcedure
    .input(z.object({ cursor: z.string().optional(), limit: z.number().int().min(1).max(100).default(50) }).optional())
    .query(async ({ ctx, input }) => {
      const limit = input?.limit ?? 50;
      const rows = await ctx.db.contact.findMany({
        orderBy: { createdAt: 'desc' },
        take: limit + 1,
        ...(input?.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
        include: {
          creator: { select: { username: true } },
          from: { select: { email: true, name: true } },
        },
      });
      const hasMore = rows.length > limit;
      const page = hasMore ? rows.slice(0, limit) : rows;
      return { items: page, nextCursor: hasMore ? page[page.length - 1].id : null };
    }),
});
