import { test } from 'node:test';
import assert from 'node:assert/strict';
import { recomputeCreatorAggregates } from './aggregates';

type Account = { followers: number; engagementRate: number | null };

/**
 * Minimal in-memory stand-in for the two Prisma delegates the function touches.
 * Captures the `data` written to creatorProfile.update so we can assert on it.
 */
function makeDb(accounts: Account[]) {
  const captured: { maxFollowers?: number; maxEngagement?: number } = {};
  const db = {
    socialAccount: {
      findMany: async () => accounts,
    },
    creatorProfile: {
      update: async ({ data }: { data: { maxFollowers: number; maxEngagement: number } }) => {
        captured.maxFollowers = data.maxFollowers;
        captured.maxEngagement = data.maxEngagement;
        return data;
      },
    },
  };
  // Cast through unknown — the function only uses these two delegates.
  return { db: db as unknown as Parameters<typeof recomputeCreatorAggregates>[0], captured };
}

test('no accounts → zeros (no NaN, no crash)', async () => {
  const { db, captured } = makeDb([]);
  await recomputeCreatorAggregates(db, 'c1');
  assert.equal(captured.maxFollowers, 0);
  assert.equal(captured.maxEngagement, 0);
});

test('maxFollowers = highest follower count across accounts', async () => {
  const { db, captured } = makeDb([
    { followers: 100, engagementRate: 5 },
    { followers: 900, engagementRate: 3 },
    { followers: 400, engagementRate: 9 },
  ]);
  await recomputeCreatorAggregates(db, 'c1');
  assert.equal(captured.maxFollowers, 900);
});

test('maxEngagement = engagement of the TOP-followers account (representative)', async () => {
  // The 900-follower account has eng 3, even though a smaller account has eng 9.
  const { db, captured } = makeDb([
    { followers: 900, engagementRate: 3 },
    { followers: 400, engagementRate: 9 },
  ]);
  await recomputeCreatorAggregates(db, 'c1');
  assert.equal(captured.maxEngagement, 3);
});

test('falls back to max engagement when the top account has no engagement', async () => {
  // Top account (900) has null engagement → fall back to the max (9) elsewhere.
  const { db, captured } = makeDb([
    { followers: 900, engagementRate: null },
    { followers: 400, engagementRate: 9 },
  ]);
  await recomputeCreatorAggregates(db, 'c1');
  assert.equal(captured.maxFollowers, 900);
  assert.equal(captured.maxEngagement, 9);
});

test('single account → its own values', async () => {
  const { db, captured } = makeDb([{ followers: 1234, engagementRate: 7 }]);
  await recomputeCreatorAggregates(db, 'c1');
  assert.equal(captured.maxFollowers, 1234);
  assert.equal(captured.maxEngagement, 7);
});

test('top account with zero engagement and no other engagement → 0', async () => {
  const { db, captured } = makeDb([{ followers: 500, engagementRate: 0 }]);
  await recomputeCreatorAggregates(db, 'c1');
  assert.equal(captured.maxEngagement, 0);
});
