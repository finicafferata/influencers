import { test } from 'node:test';
import assert from 'node:assert/strict';
import { recordEvent } from './analytics';

function fakeDb(create: (args: unknown) => Promise<unknown>) {
  return { analyticsEvent: { create } } as unknown as Parameters<typeof recordEvent>[0];
}

test('writes an event with normalized null fields', async () => {
  let captured: { data: Record<string, unknown> } | null = null;
  const db = fakeDb(async (args) => {
    captured = args as { data: Record<string, unknown> };
    return {};
  });
  await recordEvent(db, 'profile_published', { userId: 'u1', creatorId: 'c1' });
  assert.ok(captured);
  assert.equal(captured!.data.type, 'profile_published');
  assert.equal(captured!.data.userId, 'u1');
  assert.equal(captured!.data.creatorId, 'c1');
  assert.equal(captured!.data.orgId, null); // unset → null, not undefined
});

test('never throws even if the DB write rejects (must not break the request)', async () => {
  const db = fakeDb(async () => {
    throw new Error('db down');
  });
  // Should resolve, not reject.
  await assert.doesNotReject(() => recordEvent(db, 'search_performed', { meta: { total: 3 } }));
});

test('defaults to empty data when none provided', async () => {
  let captured: { data: Record<string, unknown> } | null = null;
  const db = fakeDb(async (args) => {
    captured = args as { data: Record<string, unknown> };
    return {};
  });
  await recordEvent(db, 'contact_sent');
  assert.equal(captured!.data.type, 'contact_sent');
  assert.equal(captured!.data.userId, null);
});
