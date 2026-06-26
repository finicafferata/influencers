import { z } from 'zod';
import { router, orgProcedure } from '../trpc';
import { PLATFORM_SET, CONTENT_TYPES } from '../constants';
import { buildCreatorWhere, CREATOR_CARD_INCLUDE, toCardPayload } from '../retrieval';
import type { Prisma } from '@repo/db';

const searchInput = z.object({
  niches: z.array(z.string()).optional(),
  country: z.string().max(2).optional(),
  city: z.string().max(120).optional(),
  contentType: z.enum(CONTENT_TYPES).optional(),
  platform: z.string().refine((p) => PLATFORM_SET.has(p)).optional(),
  followersMin: z.number().int().nonnegative().optional(),
  followersMax: z.number().int().nonnegative().optional(),
  engagementMin: z.number().min(0).max(100).optional(),
  engagementMax: z.number().min(0).max(100).optional(),
  tags: z.array(z.string()).optional(),
  audienceCountry: z.string().max(2).optional(),
  q: z.string().trim().max(80).optional(),
  sort: z.enum(['followers', 'engagement', 'recent']).default('followers'),
  cursor: z.string().optional(),
  limit: z.number().int().min(1).max(50).default(20),
});

export type CreatorSearchInput = z.infer<typeof searchInput>;

function buildOrderBy(sort: CreatorSearchInput['sort']): Prisma.CreatorProfileOrderByWithRelationInput[] {
  // Sort on denormalized columns so the keyset cursor is stable (REVIEW-01 C5).
  switch (sort) {
    case 'followers':
      return [{ maxFollowers: 'desc' }, { id: 'asc' }];
    case 'engagement':
      return [{ maxEngagement: 'desc' }, { id: 'asc' }];
    case 'recent':
      return [{ createdAt: 'desc' }, { id: 'asc' }];
  }
}

export const searchRouter = router({
  creators: orgProcedure('can_search_creators')
    .input(searchInput)
    .query(async ({ ctx, input }) => {
      const where = buildCreatorWhere(input);
      const orderBy = buildOrderBy(input.sort);

      const [rows, total] = await Promise.all([
        ctx.db.creatorProfile.findMany({
          where,
          orderBy,
          take: input.limit + 1,
          ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
          include: CREATOR_CARD_INCLUDE,
        }),
        ctx.db.creatorProfile.count({ where }),
      ]);

      const hasMore = rows.length > input.limit;
      const page = hasMore ? rows.slice(0, input.limit) : rows;
      const items = page.map(toCardPayload);

      return {
        items,
        nextCursor: hasMore ? page[page.length - 1].id : null,
        total,
      };
    }),
});
