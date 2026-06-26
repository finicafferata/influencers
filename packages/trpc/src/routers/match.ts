import { z } from 'zod';
import type { Prisma } from '@repo/db';
import { router, orgProcedure, rateLimit } from '../trpc';
import { NICHES, NICHE_SLUGS, PLATFORM_SET, CONTENT_TYPES } from '../constants';
import { buildCreatorWhere, CREATOR_CARD_INCLUDE, toCardPayload } from '../retrieval';
import { matchScore } from '../matchScore';
import type { ParsedCriteria } from '../llm';

const RELEVANCE_THRESHOLD = 0.5;
const MIN_GOOD = 5;
const CANDIDATE_CAP = 100;

// Light country-name → code map for the no-LLM fallback parse.
const COUNTRY_HINTS: Record<string, string> = {
  argentina: 'AR', méxico: 'MX', mexico: 'MX', brasil: 'BR', brazil: 'BR',
  chile: 'CL', colombia: 'CO', perú: 'PE', peru: 'PE', uruguay: 'UY', españa: 'ES', espana: 'ES',
};

const criteriaSchema = z.object({
  niches: z.array(z.string()).default([]),
  country: z.string().max(2).optional(),
  platform: z.string().optional(),
  followersMin: z.number().int().nonnegative().optional(),
  followersMax: z.number().int().nonnegative().optional(),
  engagementMin: z.number().min(0).max(100).optional(),
  contentType: z.enum(CONTENT_TYPES).optional(),
  audienceCountry: z.string().max(2).optional(),
  budget: z.number().nonnegative().optional(),
});

/** Clamp + filter LLM/fallback output to values our data understands. */
function sanitize(c: ParsedCriteria): ParsedCriteria {
  return {
    niches: (c.niches ?? []).filter((n) => NICHE_SLUGS.has(n)).slice(0, 10),
    country: c.country ? c.country.toUpperCase().slice(0, 2) : undefined,
    platform: c.platform && PLATFORM_SET.has(c.platform) ? c.platform : undefined,
    followersMin: c.followersMin != null ? Math.max(0, Math.floor(c.followersMin)) : undefined,
    followersMax: c.followersMax != null ? Math.max(0, Math.floor(c.followersMax)) : undefined,
    engagementMin: c.engagementMin != null ? Math.min(100, Math.max(0, c.engagementMin)) : undefined,
    contentType: c.contentType,
    audienceCountry: c.audienceCountry ? c.audienceCountry.toUpperCase().slice(0, 2) : undefined,
    budget: c.budget != null ? Math.max(0, c.budget) : undefined,
  };
}

/** Heuristic parse when no LLM is configured. */
function fallbackParse(text: string): ParsedCriteria {
  const lower = text.toLowerCase();
  const niches = NICHES.filter(
    (n) => lower.includes(n.labelEs.toLowerCase()) || lower.includes(n.slug),
  ).map((n) => n.slug);

  let country: string | undefined;
  for (const [name, code] of Object.entries(COUNTRY_HINTS)) {
    if (lower.includes(name)) { country = code; break; }
  }

  // crude follower band: "20k", "20-80k", "100000"
  let followersMin: number | undefined;
  let followersMax: number | undefined;
  const range = lower.match(/(\d+)\s*[-aA]\s*(\d+)\s*k/);
  if (range) { followersMin = Number(range[1]) * 1000; followersMax = Number(range[2]) * 1000; }
  else {
    const single = lower.match(/(\d+)\s*k/);
    if (single) followersMin = Number(single[1]) * 1000;
  }

  return sanitize({ niches, country, followersMin, followersMax });
}

interface Match {
  creator: ReturnType<typeof toCardPayload>;
  score: number;
  breakdown: Record<string, number>;
  rationale?: string;
}

export const matchRouter = router({
  parseBrief: orgProcedure('can_search_creators')
    .use(rateLimit({ key: 'match.parse', limit: 20, windowMs: 60_000 }))
    .input(z.object({ text: z.string().trim().min(1).max(1000) }))
    .mutation(async ({ ctx, input }): Promise<ParsedCriteria> => {
      if (ctx.llm?.enabled) {
        try {
          return sanitize(await ctx.llm.parseBrief(input.text));
        } catch {
          // fall through to heuristic on LLM failure
        }
      }
      return fallbackParse(input.text);
    }),

  run: orgProcedure('can_search_creators')
    .use(rateLimit({ key: 'match.run', limit: 10, windowMs: 60_000 }))
    .input(z.object({ criteria: criteriaSchema, limit: z.number().int().min(1).max(20).default(10) }))
    .query(async ({ ctx, input }) => {
      const criteria = sanitize(input.criteria);

      async function pool(where: Prisma.CreatorProfileWhereInput) {
        return ctx.db.creatorProfile.findMany({ where, include: CREATOR_CARD_INCLUDE, take: CANDIDATE_CAP });
      }

      // Primary pool: categorical constraints (incl. audience country) — reach
      // handled by scoring. The relaxed pool below stays country-only so it can
      // surface audience near-misses.
      const primary = await pool(
        buildCreatorWhere({
          niches: criteria.niches,
          country: criteria.country,
          contentType: criteria.contentType,
          audienceCountry: criteria.audienceCountry,
        }),
      );

      const scored = primary
        .map((c) => {
          const { score, breakdown } = matchScore(criteria, c);
          return { creator: toCardPayload(c), score, breakdown } as Match;
        })
        .sort((a, b) => b.score - a.score || b.creator.maxFollowers - a.creator.maxFollowers);

      const exact = scored.filter((m) => m.score >= RELEVANCE_THRESHOLD).slice(0, input.limit);

      // Relaxed fallback: broaden (country only) if too few good matches.
      let approximate: Match[] = [];
      if (exact.length < MIN_GOOD) {
        const exactIds = new Set(exact.map((m) => m.creator.id));
        const relaxed = await pool(buildCreatorWhere({ country: criteria.country }));
        approximate = relaxed
          .filter((c) => !exactIds.has(c.id))
          .map((c) => {
            const { score, breakdown } = matchScore(criteria, c);
            return { creator: toCardPayload(c), score, breakdown } as Match;
          })
          .sort((a, b) => b.score - a.score)
          .slice(0, input.limit - exact.length);
      }

      // Grounded one-line rationales (batched), only when LLM is enabled.
      if (ctx.llm?.enabled) {
        const targets = [...exact, ...approximate];
        if (targets.length > 0) {
          try {
            const facts = targets.map((m) => ({
              id: m.creator.id,
              facts: `@${m.creator.username} · ${m.creator.country ?? ''} · ${m.creator.niches.join(', ')} · ${m.creator.maxFollowers} seguidores · ${m.creator.maxEngagement}% engagement`,
            }));
            const rationales = await ctx.llm.rationales({ brief: JSON.stringify(criteria), creators: facts });
            for (const m of targets) m.rationale = rationales[m.creator.id];
          } catch {
            /* rationales are cosmetic — ignore failures */
          }
        }
      }

      return { criteria, exact, approximate };
    }),

  feedback: orgProcedure('can_search_creators')
    .input(z.object({ creatorId: z.string(), vote: z.enum(['up', 'down']), briefText: z.string().max(1000).optional() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.matchFeedback.upsert({
        where: { orgId_creatorId: { orgId: ctx.orgId, creatorId: input.creatorId } },
        create: { orgId: ctx.orgId, userId: ctx.userId!, creatorId: input.creatorId, vote: input.vote, briefText: input.briefText },
        update: { userId: ctx.userId!, vote: input.vote, briefText: input.briefText },
      });
      return { ok: true };
    }),
});
