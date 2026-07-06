# AM-04 — `match` router: parseBrief / run / feedback

*Backend · Depends on: AM-01, AM-02, AM-03*

## Objective
The orchestration: parse → retrieve → score → split → rationalize → return; plus feedback.

## Requirements (all `orgProcedure('can_search_creators')`, rate-limited)
1. **`match.parseBrief({ text })`** → `ParsedCriteria`. If `ctx.llm?.enabled`, use it; else keyword-fallback (match text against niche `labelEs`/slug + country names). Validate niches ⊆ constant, clamp numbers. `rateLimit({ key:'match.parse', limit:20, windowMs:60_000 })`.
2. **`match.run({ criteria, limit=10 })`**:
   - Retrieve candidates via `buildCreatorWhere` on the **core** constraints (cap ~100), `CREATOR_CARD_INCLUDE`.
   - `matchScore` each → sort desc, tie-break `maxFollowers`.
   - **Honest** = score ≥ `RELEVANCE_THRESHOLD`; if `< MIN_GOOD`, second relaxed retrieval (drop reach band) → `approximate` (labeled, deduped vs exact).
   - **Rationales:** if `ctx.llm?.enabled`, one batched call over top-N (facts = `@username · país · nichos · reach · engagement`); map by id; omit otherwise.
   - Return `{ criteria, exact: Match[], approximate: Match[] }`, `Match = { creator: CardPayload, score, breakdown, rationale? }`.
   - `rateLimit({ key:'match.run', limit:10, windowMs:60_000 })` (≤2 model calls each).
3. **`match.feedback({ creatorId, vote: 'up'|'down', briefText? })`** → upsert `MatchFeedback` on `(orgId, creatorId)` with caller's `userId`. Fire-and-forget.
4. Register `match` in `root.ts`.

## Contracts
```ts
match.parseBrief({text}): ParsedCriteria
match.run({criteria, limit?}): { criteria; exact: Match[]; approximate: Match[] }
match.feedback({creatorId, vote, briefText?}): { ok: true }
```

## Acceptance
- A brief returns ranked exact matches (deterministic) with one-line reasons (when LLM enabled).
- A too-narrow brief returns a short honest set + labeled `approximate`.
- Scoring is deterministic regardless of LLM; no-LLM run still returns ranked matches (no rationale).
- `feedback` upsert: one row per (org, creator).

## Test plan
- Unit: relaxed-split trigger; dedupe exact/approximate; criteria validation.
- Integration (mock LLM): ordering on the seed set; ≤2 calls/run; feedback upsert idempotent.

## Human review
- [ ] Approve `RELEVANCE_THRESHOLD` + `MIN_GOOD` defaults.
- [ ] Approve which "facts" go to the rationale prompt.
- [ ] Approve per-route rate limits.
