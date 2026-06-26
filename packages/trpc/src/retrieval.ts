import type { Prisma } from '@repo/db';
import type { ContentType } from './constants';

/**
 * Filter-only fields shared by search and AI-match. Both `CreatorSearchInput`
 * (which adds q/sort/cursor/limit) and the match `ParsedCriteria` are
 * structurally assignable to this.
 */
export interface CreatorFilter {
  niches?: string[];
  tags?: string[];
  country?: string;
  city?: string;
  contentType?: ContentType;
  platform?: string;
  followersMin?: number;
  followersMax?: number;
  engagementMin?: number;
  engagementMax?: number;
  /** Filter by the account's dominant AUDIENCE country (not creator location). */
  audienceCountry?: string;
  q?: string;
}

/** Single source of truth for the published-creator WHERE clause. */
export function buildCreatorWhere(input: CreatorFilter): Prisma.CreatorProfileWhereInput {
  const where: Prisma.CreatorProfileWhereInput = {
    published: true,
    user: { suspended: false },
  };

  if (input.niches?.length) where.niches = { hasSome: input.niches };
  if (input.tags?.length) where.tags = { hasSome: input.tags };
  if (input.country) where.country = input.country;
  if (input.city) where.city = input.city;
  if (input.contentType) where.contentType = input.contentType;

  const accountFilter: Prisma.SocialAccountWhereInput = {};
  if (input.platform) accountFilter.platform = input.platform;
  if (input.followersMin != null || input.followersMax != null) {
    accountFilter.followers = {
      ...(input.followersMin != null ? { gte: input.followersMin } : {}),
      ...(input.followersMax != null ? { lte: input.followersMax } : {}),
    };
  }
  if (input.engagementMin != null || input.engagementMax != null) {
    accountFilter.engagementRate = {
      ...(input.engagementMin != null ? { gte: input.engagementMin } : {}),
      ...(input.engagementMax != null ? { lte: input.engagementMax } : {}),
    };
  }
  // Audience-country MERGES into the same accountFilter (one account must meet
  // reach AND audience) — never a second `socialAccounts` key (would overwrite).
  if (input.audienceCountry) accountFilter.audienceTopCountry = input.audienceCountry;
  if (Object.keys(accountFilter).length > 0) {
    where.socialAccounts = { some: accountFilter };
  }

  if (input.q) {
    where.OR = [
      { headline: { contains: input.q, mode: 'insensitive' } },
      { username: { contains: input.q, mode: 'insensitive' } },
    ];
  }

  return where;
}

/** The fetch shape needed to build a card payload. */
export const CREATOR_CARD_INCLUDE = {
  socialAccounts: {
    orderBy: { followers: 'desc' } as const,
    select: { platform: true, followers: true, engagementRate: true, verified: true, audienceTopCountry: true },
  },
  user: { select: { name: true, avatar: true } },
} satisfies Prisma.CreatorProfileInclude;

export type CreatorWithCardData = Prisma.CreatorProfileGetPayload<{
  include: typeof CREATOR_CARD_INCLUDE;
}>;

export interface CardPayload {
  id: string;
  username: string;
  name: string | null;
  avatar: string | null;
  headline: string | null;
  country: string | null;
  contentType: string | null;
  niches: string[];
  maxFollowers: number;
  maxEngagement: number;
  verified: boolean;
  topAccounts: { platform: string; followers: number; engagementRate: number | null; verified: boolean; audienceTopCountry: string | null }[];
}

/** Project a fetched creator into the shared card shape. */
export function toCardPayload(p: CreatorWithCardData): CardPayload {
  return {
    id: p.id,
    username: p.username,
    name: p.user.name,
    avatar: p.user.avatar,
    headline: p.headline,
    country: p.country,
    contentType: p.contentType,
    niches: p.niches,
    maxFollowers: p.maxFollowers,
    maxEngagement: p.maxEngagement,
    verified: p.socialAccounts.some((a) => a.verified),
    topAccounts: p.socialAccounts.slice(0, 2),
  };
}
