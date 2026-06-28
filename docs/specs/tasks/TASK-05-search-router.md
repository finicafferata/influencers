# TASK-05 — Search Router + Query Builder

*High priority · the demand anchor · Depends on: TASK-02 (fields/indexes), TASK-03 (profiles exist), TASK-01 (orgProcedure)*

## Objective
Build `search.creators`: a filtered, paginated, published-only creator search gated to orgs with `can_search_creators`.

## Decisions made (best-practice) — REVISED per REVIEW-01
- **No `verifiedOnly` filter in this slice** (decision 5) — badge still displays; filter added once verified inventory exists.
- **Reach sorted on denormalized `maxFollowers`; engagement sorted on denormalized `maxEngagement`** (REVIEW-01 C5) — both keyset-stable for cursors. Reach/engagement *filters* still use the `socialAccounts.some` relation.
- **Cursor pagination** keyed on `(sortColumn, id)` (always a denormalized column + unique id). Limit default 20, max 50. **Also return `total`** (count query) for "X creadores encontrados" (REVIEW-01 moderate #5).
- **Free-text `q`** over `headline` + `username` via `pg_trgm` trigram GIN index (added in TASK-02).
- **Exclude suspended**, but the **hot path is the indexed `published:true`** — `admin.suspendUser` also unpublishes, so suspended creators fall out via the indexed gate; the `user.suspended` relation filter is a belt-and-suspenders addition (REVIEW-01 C4).
- **`getByUsername` (the public profile feed) gets its own moderate throttle** since it's unauthenticated and exposes public rates (REVIEW-01 C6).
- **Per-route rate limits** — `search.creators` must NOT inherit the global 5/60s (would 429 the filter UI); set a generous search limit.
- **Where-builder omits undefined keys** so absent filters never constrain.

## Scope
**In:** `search.creators` query, where-clause builder, pagination, sort, card payload shape, indexes usage.
**Out:** saved searches (backlog), `verifiedOnly` (deferred), UI (TASK-06).

## Requirements
1. `search.creators` (orgProcedure requiring `can_search_creators`, query) input:
```ts
{
  niches?: string[];          // hasSome over slugs
  country?: string;
  city?: string;
  contentType?: 'ugc'|'influencer'|'both';
  platform?: string;          // with reach filters → socialAccounts.some
  followersMin?: number; followersMax?: number;
  engagementMin?: number; engagementMax?: number;
  tags?: string[];            // hasSome
  q?: string;                 // trigram over headline + username
  sort?: 'followers'|'engagement'|'recent';  // default 'followers'
  cursor?: string; limit?: number; // default 20, max 50
}
```
2. **Always** include `published: true`; exclude suspended users.
3. **Where-builder:** skip undefined; niches/tags → `hasSome`; reach → `socialAccounts: { some: { platform?, followers: {gte,lte}, engagementRate: {gte,lte} } }`.
4. **Sort:** `followers` → `maxFollowers desc`; `engagement` → `maxEngagement desc` (denormalized, REVIEW-01 C5); `recent` → `createdAt desc`. Cursor keyed to `(sortColumn, id)` — always a denormalized column.
5. **Card payload (subset):** `{ id, username, headline, avatar, country, niches, contentType, maxFollowers, topAccounts: [{platform, followers, engagementRate, verified}], verified: boolean }`.
6. Return `{ items, nextCursor, total }`; empty result returns `{ items: [], nextCursor: null, total: 0 }`.

## Acceptance criteria
- Filtering by any subset returns only matching, published, non-suspended creators.
- Reach filter + followers sort agree (a creator filtered in by `followersMin` is ordered by `maxFollowers`).
- Pagination is stable across pages (no dupes/skips) under each sort.
- Empty filters return a broad published list; impossible filters return an empty payload.

## Test plan
- Unit (the core risk): where-builder maps every filter/omits undefined; cursor encode/decode; engagement-account selection rule.
- Integration: seeded dataset (≥5 creators across niches/countries/platforms) exercising each filter + each sort + pagination boundaries.

## Human review
- [ ] Approve dropping `verifiedOnly` for the slice.
- [ ] Approve the engagement-sort representative-account rule.
- [ ] Approve `q` scope (headline + username, trigram) for v1.
- [ ] Approve default sort = followers, limit 20/max 50.
