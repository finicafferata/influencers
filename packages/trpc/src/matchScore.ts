import type { ParsedCriteria } from './llm';

export interface ScoreCandidate {
  niches: string[];
  maxFollowers: number;
  maxEngagement: number;
  contentType: string | null;
  country: string | null;
  socialAccounts?: { audienceTopCountry: string | null }[];
}

export interface ScoreResult {
  score: number;
  breakdown: Record<string, number>;
}

// Audience added in Phase 3. The non-audience weights are the Phase-2 weights
// scaled by 0.8 (preserving their RATIOS), plus audience 0.2. So when no
// audience criterion is set, the audience term is a constant (1·0.2) and the
// rest is a strict positive scaling of the Phase-2 score → IDENTICAL ranking
// (just rescaling, not reweighting). Phase-2 was niche .4/reach .25/eng .2/
// contentType .1/country .05.
const WEIGHTS = { niche: 0.32, reach: 0.2, engagement: 0.16, audience: 0.2, contentType: 0.08, country: 0.04 };

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

/** reach fit: 1 inside the band, linear falloff just outside (within 50% of the band edge). */
function reachFit(followers: number, min?: number, max?: number): number {
  if (min == null && max == null) return 1;
  if (min != null && followers < min) {
    const tol = Math.max(1, min * 0.5);
    return clamp01(1 - (min - followers) / tol);
  }
  if (max != null && followers > max) {
    const tol = Math.max(1, max * 0.5);
    return clamp01(1 - (followers - max) / tol);
  }
  return 1;
}

/**
 * Deterministic, explainable match score in [0,1]. Every component is neutral
 * (1) when its criterion is unspecified, so absent criteria never penalize.
 */
export function matchScore(criteria: ParsedCriteria, c: ScoreCandidate): ScoreResult {
  const niche =
    criteria.niches.length === 0
      ? 1
      : c.niches.filter((n) => criteria.niches.includes(n)).length / criteria.niches.length;

  const reach = reachFit(c.maxFollowers, criteria.followersMin, criteria.followersMax);

  const engagement =
    criteria.engagementMin == null || criteria.engagementMin === 0
      ? 1
      : clamp01(c.maxEngagement / criteria.engagementMin);

  const contentType = !criteria.contentType
    ? 1
    : c.contentType === criteria.contentType || c.contentType === 'both'
      ? 1
      : 0;

  const country = !criteria.country ? 1 : c.country === criteria.country ? 1 : 0;

  const audience = !criteria.audienceCountry
    ? 1
    : (c.socialAccounts ?? []).some((a) => a.audienceTopCountry === criteria.audienceCountry)
      ? 1
      : 0;

  const breakdown = { niche, reach, engagement, audience, contentType, country };
  const score =
    niche * WEIGHTS.niche +
    reach * WEIGHTS.reach +
    engagement * WEIGHTS.engagement +
    audience * WEIGHTS.audience +
    contentType * WEIGHTS.contentType +
    country * WEIGHTS.country;

  return { score, breakdown };
}

export { WEIGHTS as MATCH_WEIGHTS };
