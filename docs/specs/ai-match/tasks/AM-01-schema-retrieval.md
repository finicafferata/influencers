# AM-01 — MatchFeedback schema + shared retrieval/card refactor

*Backend · Depends on: none*

## Objective
Add the feedback model and extract the retrieval where-builder + card projection into shared modules both `search` and `match` use.

## Decisions
- **Feedback per-org** (`@@unique([orgId, creatorId])`).
- Behavior-preserving refactor — `search.creators` must work identically.

## Requirements
1. **Schema** (`packages/db/prisma/schema.prisma`):
   - `MatchFeedback { id, orgId, userId, creatorId, vote String, briefText String?, createdAt }`, `@@unique([orgId, creatorId])`, `@@index([orgId])`, `@@index([creatorId])`.
   - Back-relations: `Organization.matchFeedback`, `User.matchFeedback`, `CreatorProfile.matchFeedback`.
   - Migration additive.
2. **Shared filter type + where-builder** (`packages/trpc/src/retrieval.ts`):
   - `CreatorFilter` = the filter-only fields (niches, country, city, contentType, platform, followersMin/Max, engagementMin/Max, tags, q?) — a narrower type both `searchInput` and `ParsedCriteria` satisfy.
   - `buildCreatorWhere(f: CreatorFilter): Prisma.CreatorProfileWhereInput` — moved verbatim from `search.ts` (keeps `published:true` + `user.suspended:false`).
3. **Shared card projection** (`retrieval.ts`):
   - `CREATOR_CARD_INCLUDE` (ordered `socialAccounts` select + `user{name,avatar}`) and `toCardPayload(profile)` → the existing card shape. `search.ts` imports both.

## Acceptance
- Migration applies; `MatchFeedback` upsert keyed on `(orgId, creatorId)` is possible.
- `search.creators` returns byte-identical results after importing the shared builder + projection (regression check).

## Test plan
- Unit: `buildCreatorWhere` maps each filter (parity with old `buildWhere`).
- Integration: search results unchanged pre/post refactor on the seed set.

## Human review
- [ ] Confirm per-org feedback key (userId = last voter).
- [ ] Approve `retrieval.ts` location + `CreatorFilter` shape.
