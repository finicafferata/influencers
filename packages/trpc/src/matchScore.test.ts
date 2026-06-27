import { test } from 'node:test';
import assert from 'node:assert/strict';
import { matchScore, MATCH_WEIGHTS, type ScoreCandidate } from './matchScore';
import type { ParsedCriteria } from './llm';

const base: ScoreCandidate = {
  niches: ['fitness', 'food'],
  maxFollowers: 50_000,
  maxEngagement: 4,
  contentType: 'influencer',
  country: 'AR',
  socialAccounts: [{ audienceTopCountry: 'AR' }],
};

const empty: ParsedCriteria = { niches: [] };

test('weights sum to 1', () => {
  const sum = Object.values(MATCH_WEIGHTS).reduce((a, b) => a + b, 0);
  assert.ok(Math.abs(sum - 1) < 1e-9, `weights sum=${sum}`);
});

test('no criteria → perfect score (every component neutral)', () => {
  const { score, breakdown } = matchScore(empty, base);
  assert.equal(score, 1);
  for (const v of Object.values(breakdown)) assert.equal(v, 1);
});

test('score always within [0,1]', () => {
  const criteria: ParsedCriteria = {
    niches: ['fitness'],
    country: 'AR',
    contentType: 'influencer',
    audienceCountry: 'AR',
    followersMin: 1000,
    followersMax: 100_000,
    engagementMin: 2,
  };
  const { score } = matchScore(criteria, base);
  assert.ok(score >= 0 && score <= 1, `score=${score}`);
});

test('niche term stays clamped at 1 even with duplicate candidate niches (F1)', () => {
  // criteria asks for one niche; candidate lists it twice → matched=2, /1 = 2
  // before clamp. The fix must keep niche ≤ 1 so total score ≤ 1.
  const criteria: ParsedCriteria = { niches: ['fitness'] };
  const dupCandidate: ScoreCandidate = { ...base, niches: ['fitness', 'fitness'] };
  const { score, breakdown } = matchScore(criteria, dupCandidate);
  assert.equal(breakdown.niche, 1);
  assert.ok(score <= 1, `score=${score}`);
});

test('partial niche coverage = fraction of requested niches matched', () => {
  const criteria: ParsedCriteria = { niches: ['fitness', 'food', 'travel'] };
  // candidate has 2 of the 3 requested
  const { breakdown } = matchScore(criteria, base);
  assert.ok(Math.abs(breakdown.niche - 2 / 3) < 1e-9, `niche=${breakdown.niche}`);
});

test('reach: 1 inside band, falls off outside, never negative', () => {
  const c: ScoreCandidate = { ...base, maxFollowers: 50_000 };
  assert.equal(matchScore({ niches: [], followersMin: 10_000, followersMax: 100_000 }, c).breakdown.reach, 1);
  // far below min → clamps to 0, not negative
  const below = matchScore({ niches: [], followersMin: 1_000_000 }, c).breakdown.reach;
  assert.ok(below >= 0 && below < 1, `below=${below}`);
});

test('zero-followers candidate does not produce NaN', () => {
  const c: ScoreCandidate = { ...base, maxFollowers: 0, maxEngagement: 0 };
  const { score, breakdown } = matchScore({ niches: ['fitness'], followersMin: 10_000, engagementMin: 5 }, c);
  for (const [k, v] of Object.entries(breakdown)) assert.ok(Number.isFinite(v), `${k}=${v}`);
  assert.ok(Number.isFinite(score));
});

test("contentType 'both' candidate matches any requested contentType", () => {
  const c: ScoreCandidate = { ...base, contentType: 'both' };
  assert.equal(matchScore({ niches: [], contentType: 'ugc' }, c).breakdown.contentType, 1);
  assert.equal(matchScore({ niches: [], contentType: 'influencer' }, c).breakdown.contentType, 1);
});

test('country / audience are binary 1|0 and neutral when unset', () => {
  assert.equal(matchScore({ niches: [], country: 'MX' }, base).breakdown.country, 0);
  assert.equal(matchScore({ niches: [], country: 'AR' }, base).breakdown.country, 1);
  assert.equal(matchScore({ niches: [], audienceCountry: 'MX' }, base).breakdown.audience, 0);
  assert.equal(matchScore({ niches: [] }, base).breakdown.audience, 1);
});

test('engagement: neutral when min is 0/unset, scales when set', () => {
  assert.equal(matchScore({ niches: [], engagementMin: 0 }, base).breakdown.engagement, 1);
  const c: ScoreCandidate = { ...base, maxEngagement: 2 };
  assert.equal(matchScore({ niches: [], engagementMin: 4 }, c).breakdown.engagement, 0.5);
});
