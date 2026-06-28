# EPIC — Audience Data & Quality (Phase 3)

*Status: Draft · Wraps AD-01…06 · Depends on: Slice 1 (search/profile), Phase 2 (shared retrieval + matchScore)*

## Goal
Show brands **who a creator actually reaches** (audience geography/age/gender) and **how real it is** (authenticity badge) — the trust layer that turns CreatorLink into a buying tool. Self-declared + admin-verified now; provider-ready for later.

## Value milestone (Gate B / Definition of Done)
A creator declares per-account audience demographics; brands filter and match on **audience country** and see demographics + an authenticity badge on the kit; an admin can verify audience; and **Phase-2 ranking is unchanged when no audience criterion is used** — all self-declared, zero per-lookup cost.

## Estimates: `S` <½d · `M` ½–1d · `L` 1–2d.

Decisions in force: self-declared + admin-verified (providers deferred) · top-3 countries / 5 age bands / gender split · per-account · v1 filter = audience country · qualitative badge · **filter merges into the same `accountFilter`** · **scoring widens `ScoreCandidate` + include, neutral when unset** · audienceCountry constrains the primary match pool only.

---

### Backend

### ISS-AD.1 — Schema + constants + include extensions · `S` · `[AD-01]`
7 audience fields on `SocialAccount` + `@@index([audienceTopCountry])` + migration; `AGE_BANDS`/`GENDERS`; add audience fields to `CREATOR_CARD_INCLUDE` (scoring/cards) and `PUBLIC_PROFILE_INCLUDE` (editor/kit); `audienceCountry` on `CreatorFilter`.
**Acceptance:** migration applies (defaults backfill); both includes expose audience fields; existing search/profile payloads unchanged otherwise.
**Deps:** —. **Review:** additive; field/constant approval.

### ISS-AD.2 — setAudience + admin verifyAudience · `M` · `[AD-02]`
`creator.setAudience` (ownership-checked, derives `audienceTopCountry`, resets verification) + `admin.verifyAudience`/`unverifyAudience` + `getCreatorByUsername` select state.
**Acceptance:** creator sets per-account audience; edit resets verification; admin toggles badge; gates enforced.
**Deps:** AD.1. **Review:** pct warn-not-block; reset-on-edit.

### 🔴 ISS-AD.3 — Audience filter + match scoring · `M` · `[AD-03]` (correctness-critical)
Merge `audienceCountry` into the single `accountFilter` in `buildCreatorWhere`; add to `searchInput`, match `criteriaSchema`/`ParsedCriteria`/LLM prompt/primary pool; widen `ScoreCandidate` + add neutral-when-unset audience component + rebalance weights.
**Acceptance:** audience filter coexists with reach filter (single merged `socialAccounts.some`, no overwrite); **match with no audience criterion is byte-identical to Phase-2**; with one, audience-matching creators rank higher.
**Deps:** AD.1. **Review:** merge semantics; weights; primary-pool-only filter.

### Frontend

### ISS-AD.4 — Audience-country control in CreatorFilters · `S` · `[AD-04]`
Add `audienceCountry` to `CreatorFilterState` + a labeled "Audiencia en…" select; map in both search `input` and match `fsToCriteria`.
**Acceptance:** one shared control flows to search + match; clearly distinct from creator country.
**Deps:** AD.3. **Review:** label/placement.

### ISS-AD.5 — Per-account audience editor · `M` · `[AD-05]`
Expandable per-account Audiencia sub-form (top-3 countries+pct, age bands, gender) → `setAudience`; declarada/verificada state; pct-sum hint.
**Acceptance:** creator declares audience per account; reflects on the kit; "declarada" until verified.
**Deps:** AD.2. **Review:** compact sub-form vs separate page.

### ISS-AD.6 — Kit display + admin verify UI · `M` · `[AD-06]`
Audiencia section on `/c/[username]` (top countries %, gender, age, badge, honest labeling); admin audience verify/unverify in the creators tab.
**Acceptance:** kit shows reach demographics + authenticity state; admin toggles the badge.
**Deps:** AD.2. **Review:** per-account vs blended display; labeling.

---

## Build order
ISS-AD.1 → AD.2 + AD.3 (parallel) → AD.4 (after AD.3) + AD.5 + AD.6 (after AD.2).

## Human review plan
- **Gate A (before code):** approve the 7 fields, the **merge-into-same-`accountFilter`** semantics, the rebalanced match weights, and the self-declared-first posture. Tick each task's Human-review list.
- **Per-issue:** PR confirms the single-merged-`some` (AD.3), the Phase-2 ranking parity when no audience criterion (AD.3), ownership/admin gates (AD.2), and honest declared-vs-verified labeling (AD.6).
- **Gate B (before close):** demo declare→filter/match→verify→kit-badge end-to-end (DoD).

## Out of scope (backlog — the "later/paid" tier)
Provider integration (Phyllo/Modash/HypeAuditor) with real demographics + numeric authenticity score (D1); platform OAuth (D2); audience overlap / brand-fit modeling (D3); historical trends (D4); lookalikes (D5); gender/age filters (fast-follow).
