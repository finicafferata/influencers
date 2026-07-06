import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildCreatorWhere } from './retrieval';

test('always constrains to published + non-suspended (no leakage)', () => {
  const where = buildCreatorWhere({});
  assert.equal(where.published, true);
  assert.deepEqual(where.user, { suspended: false });
});

test('empty filter adds no extra constraints beyond the base gate', () => {
  const where = buildCreatorWhere({});
  // only published + user gate
  assert.deepEqual(Object.keys(where).sort(), ['published', 'user']);
});

test('niches/tags use hasSome (array overlap)', () => {
  const where = buildCreatorWhere({ niches: ['fitness'], tags: ['vegan'] });
  assert.deepEqual(where.niches, { hasSome: ['fitness'] });
  assert.deepEqual(where.tags, { hasSome: ['vegan'] });
});

test('empty arrays are ignored (no hasSome on [])', () => {
  const where = buildCreatorWhere({ niches: [], tags: [] });
  assert.equal('niches' in where, false);
  assert.equal('tags' in where, false);
});

test('scalar equality filters pass through', () => {
  const where = buildCreatorWhere({ country: 'AR', city: 'CABA', contentType: 'ugc' });
  assert.equal(where.country, 'AR');
  assert.equal(where.city, 'CABA');
  assert.equal(where.contentType, 'ugc');
});

test('follower + engagement bands merge into ONE socialAccounts.some filter', () => {
  const where = buildCreatorWhere({ followersMin: 1000, followersMax: 5000, engagementMin: 2, engagementMax: 8 });
  const some = (where.socialAccounts as { some: Record<string, unknown> }).some;
  assert.deepEqual(some.followers, { gte: 1000, lte: 5000 });
  assert.deepEqual(some.engagementRate, { gte: 2, lte: 8 });
});

test('only-min and only-max bands omit the missing bound', () => {
  const lo = buildCreatorWhere({ followersMin: 1000 });
  assert.deepEqual((lo.socialAccounts as { some: { followers: unknown } }).some.followers, { gte: 1000 });
  const hi = buildCreatorWhere({ followersMax: 5000 });
  assert.deepEqual((hi.socialAccounts as { some: { followers: unknown } }).some.followers, { lte: 5000 });
});

test('audienceCountry MERGES into the same account filter (not a second key)', () => {
  const where = buildCreatorWhere({ platform: 'instagram', followersMin: 1000, audienceCountry: 'MX' });
  const some = (where.socialAccounts as { some: Record<string, unknown> }).some;
  // one account must satisfy reach AND platform AND audience together
  assert.equal(some.platform, 'instagram');
  assert.deepEqual(some.followers, { gte: 1000 });
  assert.equal(some.audienceTopCountry, 'MX');
});

test('no account-level filters → no socialAccounts key at all', () => {
  const where = buildCreatorWhere({ country: 'AR' });
  assert.equal('socialAccounts' in where, false);
});

test('q builds a case-insensitive OR over headline + username (parameterized, no raw SQL)', () => {
  const where = buildCreatorWhere({ q: "o'brien" });
  assert.deepEqual(where.OR, [
    { headline: { contains: "o'brien", mode: 'insensitive' } },
    { username: { contains: "o'brien", mode: 'insensitive' } },
  ]);
});

test('empty q string is ignored', () => {
  const where = buildCreatorWhere({ q: '' });
  assert.equal('OR' in where, false);
});
