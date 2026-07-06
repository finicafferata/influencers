# AD-03 — Audience filter + match scoring

*Backend · Depends on: AD-01 · Contains the two correctness traps*

## Objective
Make search and match audience-aware: a queryable audience-country filter (without breaking the existing account filter) and an audience-fit score component (without regressing Phase-2 ranking).

## Requirements
1. **Filter (merge, not overwrite)** — in `buildCreatorWhere` (`retrieval.ts`): when `input.audienceCountry`, set `accountFilter.audienceTopCountry = input.audienceCountry` **into the existing `accountFilter`** before the single `where.socialAccounts = { some: accountFilter }`. Do NOT add a second `socialAccounts` key.
2. **Search input:** add `audienceCountry?` to `searchInput` (`search.ts`).
3. **Match:** add `audienceCountry?` to `criteriaSchema` (`match.ts`) and `ParsedCriteria` (`llm.ts`); add it to the LLM parse prompt ("audiencia en MX" → `audienceCountry:'MX'`). In `match.run`, add `audienceCountry` to the **primary** pool's `buildCreatorWhere` call; leave the **relaxed** pool country-only.
4. **Scoring:**
   - Widen `ScoreCandidate` (`matchScore.ts`) with `socialAccounts: { audienceTopCountry: string | null }[]`.
   - Add an `audience` component: `1` if `!criteria.audienceCountry` (neutral) OR any account's `audienceTopCountry === criteria.audienceCountry`, else `0`.
   - Rebalance `WEIGHTS` (proposed: niche .35, reach .2, engagement .15, audience .2, contentType .05, country .05) — documented + tunable.

## Acceptance
- Filtering by audience country returns creators whose audience (not location) is that country; the platform/reach/engagement filter still applies (no overwrite).
- Match with an audience criterion ranks audience-matching creators higher; **with no audience criterion, ranking is byte-identical to Phase-2** (deterministic regression).

## Test plan
- Unit: `buildCreatorWhere` emits a single `socialAccounts.some` with merged audience + reach keys; `matchScore` audience component (match/unset/no-match); weight determinism; no-audience-criterion parity with prior weights? (document the new baseline).
- Integration: audience filter on seed set; primary vs relaxed pool behavior.

## Human review
- [ ] Approve merge-into-same-`some` semantics (one account meets reach AND audience).
- [ ] Approve rebalanced weights.
- [ ] Approve audienceCountry as primary-pool filter (relaxed pool exempt).
