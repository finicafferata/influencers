# Audience Data & Quality — Step 3: Implementation Checklist

*Phase 3 · Date: 2026-06-07 · Status: Draft for human review*

Items back-reference Step 2 points `[§x]` (`02-implementation.md`). Product-level definition of done, not a code diff. Each block ends with a demoable **Acceptance**.

**Decisions applied:** self-declared + admin-verified (providers deferred) · top-3 countries / 5 age bands / gender split · per-account with blended view · v1 filter = audience country · qualitative badge.

---

## Block 1 — Schema + constants `[§2, §3]`
- [ ] `SocialAccount.audienceTopCountry String?` (queryable) `[§2.1]`
- [ ] `audienceCountries Json?`, `audienceAges Json?`, `audienceGender Json?` `[§2.2–4]`
- [ ] `audienceVerified Boolean @default(false)`, `audienceSource String?`, `audienceVerifiedAt DateTime?` `[§2.5]`
- [ ] `@@index([audienceTopCountry])` `[§2.6]`
- [ ] `AGE_BANDS` + `GENDERS` shared constants `[§3.1]`

**Acceptance:** migration applies on clean + seeded DB (defaults backfill `audienceVerified=false`); existing accounts load unchanged.

## Block 2 — setAudience + payload `[§4.1]`
- [ ] `creator.setAudience({ socialAccountId, topCountries[], ages?, gender? })` (creatorProcedure, ownership-checked); derives `audienceTopCountry` from `topCountries[0]`; sets `self_declared`, resets `audienceVerified=false` `[§4.1.1]`
- [ ] Audience fields added to `CREATOR_CARD_INCLUDE` + profile includes `[§4.1.2]`

**Acceptance:** a creator sets per-account audience; editing resets verification; payloads expose the audience fields.

## Block 3 — Audience-aware discovery `[§4.2]`
- [ ] `audienceCountry?` added to `CreatorFilter` → `socialAccounts.some({ audienceTopCountry })` in shared `buildCreatorWhere` `[§4.2.3]`
- [ ] `audienceCountry` added to `searchInput`, match `criteriaSchema`/`ParsedCriteria`, and the LLM parse prompt `[§4.2.4]`

**Acceptance:** search/match filtering by audience country returns creators whose *audience* (not location) is mostly that country; both surfaces use one builder.

## Block 4 — Match scoring `[§4.3]`
- [ ] Audience component in `matchScore` (1 if any account's `audienceTopCountry` matches, or unspecified) `[§4.3.5]`
- [ ] Weights rebalanced (documented, tunable); audience optional so briefs without it are unaffected `[§4.3.5]`
- [ ] `ScoreCandidate` carries per-account audience countries `[§4.3.5]`

**Acceptance:** with an audience criterion, audience-matching creators rank higher; without it, ranking matches Phase-2 behavior (deterministic).

## Block 5 — Admin verification `[§4.4]`
- [ ] `admin.verifyAudience` / `unverifyAudience({ socialAccountId })` → set/clear `audienceVerified` + `audienceSource='admin'` + timestamp `[§4.4.6]`

**Acceptance:** admin flips "Audiencia verificada"; badge appears on the kit.

## Block 6 — Audience editor `[§5.1]`
- [ ] Per-account form in `/dashboard/profile`: top-3 countries + pct, age bands, gender split; saves via `setAudience` `[§5.1]`
- [ ] Shows declarada/verificada state `[§5.1]`

**Acceptance:** creator enters audience for each account from the editor.

## Block 7 — Kit/profile display `[§5.2]`
- [ ] Audiencia section on `/c/[username]`: top countries (%), gender split, age bands, **"Audiencia verificada"** badge when verified; honest label when self-declared `[§5.2]`

**Acceptance:** the kit shows who the creator reaches + the authenticity state.

## Block 8 — Audience filter UI `[§5.3]`
- [ ] "Audiencia en…" country control in `<CreatorFilters>` (distinct from creator country) feeding `audienceCountry` `[§5.3]`

**Acceptance:** brands filter search/match by audience country from the UI.

---

## Verification & testing (Step 9 targets)
- [ ] **Unit:** `setAudience` derives `audienceTopCountry`, resets verification; `matchScore` audience component (match/unspecified/no-match) + rebalanced weights determinism.
- [ ] **Integration:** audience-country filter returns the right creators; admin verify toggles the badge; self-declared edit resets verified.
- [ ] **Regression:** match ranking with no audience criterion equals Phase-2 output.
- [ ] **Manual:** editor UX; kit display + honest labeling; mobile; Spanish copy; pct-sum warning (not hard block).

## Definition of Done (Phase 3)
> A creator declares per-account audience demographics (top countries, age, gender), brands filter and match on **audience country** and see the demographics + an authenticity badge on the kit, an admin can verify audience, and Phase-2 ranking is unchanged when no audience criterion is used — all self-declared (provider-ready), zero per-lookup cost.

> Next: **Step 4 — code review** of the SocialAccount surface, shared filter/score touch-points, and the profile/editor/admin surfaces.
