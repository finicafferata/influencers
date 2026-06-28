# Audience Data & Quality — Step 4: Code Review (existing vs. modify vs. missing)

*Phase 3 · Date: 2026-06-07 · Status: Findings + decisions for human review*
*Mapped to `03-checklist.md` blocks, grounded in actual file contents.*

## TL;DR
**~55–60% scaffolding already exists** (verification trio + admin-verify pattern, shared `buildCreatorWhere`/`CREATOR_CARD_INCLUDE`/`PUBLIC_PROFILE_INCLUDE`/`toCardPayload`, shared `CreatorFilters`, a recompute extension that tolerates audience writes, clean additive schema). No audience code exists yet (grep-confirmed). Two correctness traps must be handled deliberately.

Legend: ✅ reusable · 🟡 modify · ❌ net-new.

## Block 1 — Schema + constants
- 🟡 `SocialAccount` (schema.prisma:100–115) has the verification trio; the 7 audience fields are **purely additive** (nullable/defaulted), `@@unique([creatorId,platform])` unaffected, `@@index([audienceTopCountry])` clean. ❌ `AGE_BANDS`/`GENDERS` constants net-new.

## Block 2 — setAudience + payload
- ❌ `setAudience` net-new (mirror social CRUD). 🟡 **`PUBLIC_PROFILE_INCLUDE` socialAccounts select** (creator.ts:13–21) has no audience fields — add them (one edit unlocks editor + kit + getByUsername, since `getMine`/`getByUsername` share it).

## 🔴 Block 3 — buildCreatorWhere DOUBLE-`some` TRAP (riskiest)
- `buildCreatorWhere` (retrieval.ts:36–52) builds **one** `where.socialAccounts = { some: accountFilter }` (line 51). A naive second `where.socialAccounts = { some: { audienceTopCountry } }` **overwrites it** — silently dropping platform/reach/engagement filters.
- **DECISION:** merge audience into the **same** `accountFilter` (`accountFilter.audienceTopCountry = input.audienceCountry`), so the existing line 51 emits it. Semantics: one account must satisfy reach **and** audience — which is the *correct* read for v1 ("their Instagram audience is MX"), not just the simplest. Do **not** add a second `socialAccounts` key.

## 🔴 Block 4 — matchScore candidate audience (two-part, must do both)
- `match.run` scores the **raw Prisma row `c`** (match.ts:107), then `toCardPayload` after — so audience IS reachable at scoring time, **provided**:
  1. 🟡 add `audienceTopCountry` to **`CREATOR_CARD_INCLUDE`** socialAccounts select (retrieval.ts:65–71) — unlocks scoring + card display in one edit (shared by search + match pool).
  2. 🟡 widen **`ScoreCandidate`** (matchScore.ts:3–9) with `socialAccounts: { audienceTopCountry: string|null }[]`.
- ❌ add the `audience` component + rebalance `WEIGHTS`; **neutral (=1) when `criteria.audienceCountry` unset** → preserves the Phase-2 deterministic-ranking regression.
- **DECISION:** in **match**, also add `audienceCountry` to the **primary** pool's `buildCreatorWhere` call (match.ts:102) so it constrains exact matches; leave the **relaxed** pool (country only) without it so the approximate set surfaces audience near-misses.

## Block 5 — admin verifyAudience
- ✅ `admin.verifySocialAccount` (admin.ts:135–151) is the exact template; mirror to `verifyAudience`/`unverifyAudience` on the audience trio. 🟡 add `audienceVerified` to `getCreatorByUsername` select (admin.ts:127) for display state. (These updates trigger the recompute — harmless, see below.)

## Block 6/7 — Editor + kit display
- 🟡 Both fed by `PUBLIC_PROFILE_INCLUDE` (extended in Block 2). Editor: per-account audience sub-form keyed by `s.id` (already selected) under the social-account card (dashboard/profile/page.tsx:209–229). Kit: an **Audiencia** section on c/[username] (near the "Redes" card, lines 130–145); reuse the `a.verified` badge pattern for "Audiencia verificada".

## Block 8 — Audience filter UI
- ✅ `CreatorFilters` is shared (search + match). 🟡 Add `audienceCountry` to `CreatorFilterState` + a labeled "Audiencia en…" select (reuse `COUNTRIES`), then map it in **both** consumers: search `input` memo and match `fsToCriteria` (+ `EMPTY_FS`, `Criteria`, `criteriaSchema`, `ParsedCriteria`, `searchInput`, `CreatorFilter`).

## Recompute interaction (confirmed benign)
`setAudience`/`verifyAudience` are `socialAccount.update`s → trigger the recompute extension. `aggregates.ts:18` reads only `followers`/`engagementRate`, so audience-only writes recompute to the **same** values — wasteful (one extra query) but harmless. (Minor: recompute bumps `CreatorProfile.updatedAt`; `sort:'recent'` uses `createdAt`, so unaffected — note for any future `updatedAt` sort.)

## Net assessment
~55–60% scaffolding reusable. Load-bearing net-new: the 7 schema fields + migration; `setAudience` (single write path, derives `audienceTopCountry`, resets verification); the two include extensions (`CREATOR_CARD_INCLUDE` for scoring/cards, `PUBLIC_PROFILE_INCLUDE` for editor/kit); `ScoreCandidate` widening + audience component.

**Single riskiest item:** the Block-3 double-`some` overwrite — resolved by the merge-into-same-`accountFilter` decision above. Second: the two-part Block-4 requirement (include select **and** ScoreCandidate widening) — both required or audience isn't available/typed at scoring time.

> Next: **Step 5 — per-task specs**, then epic/issues, then build.
