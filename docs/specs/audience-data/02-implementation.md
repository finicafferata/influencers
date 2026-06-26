# Audience Data & Quality — Step 2: Detailed Implementation Plan

*Phase 3 · Date: 2026-06-07 · Status: Draft for human review*

## 0. Decisions locked (Step 1 review)

| # | Question | Decision |
|---|----------|----------|
| Q1 | Source | **Self-declared + admin-verified now**; providers/OAuth deferred (schema-ready) |
| Q2 | Granularity | Top-3 audience countries · age bands (13-17,18-24,25-34,35-44,45+) · gender (female/male/other %) |
| Q3 | Per-account vs aggregated | **Per social account**, with a blended profile view |
| Q4 | v1 filter | **Audience country only** (gender/age fast-follow) |
| Q5 | Authenticity | **Qualitative badge** now; numeric score = provider tier |
| Q6 | Provider (backlog) | Phyllo default; Modash/HypeAuditor alternates |

## 1. Scope
**In:** per-account audience schema (queryable top country + Json breakdowns + verification fields), creator audience editor + procedure, profile/kit display, **audience-country filter in search + match**, an audience-fit nudge in `matchScore`, admin audience verification.
**Out:** provider/OAuth integration, numeric authenticity score, gender/age filters, overlap/lookalike (backlog D1–D5).

Builds on the existing per-account verification pattern and the shared `buildCreatorWhere`/`matchScore` from Phase 2.

## 2. Schema deltas (on `SocialAccount`, additive)
1. **`audienceTopCountry String?`** — the dominant audience country code (**queryable** column powering the v1 filter).
2. **`audienceCountries Json?`** — top-3 `[{ code, pct }]` for display.
3. **`audienceAges Json?`** — `{ '13-17': n, '18-24': n, ... }` (percentages).
4. **`audienceGender Json?`** — `{ female, male, other }` (percentages).
5. **`audienceVerified Boolean @default(false)`**, **`audienceSource String?`** (`self_declared|admin|provider|oauth`), **`audienceVerifiedAt DateTime?`** — phased trust (mirrors metric verification).
6. **Index** `@@index([audienceTopCountry])` for the search filter.

*No new tables — per-account columns keep search a simple `socialAccounts.some({ audienceTopCountry })`.*

## 3. Constants
1. `AGE_BANDS = ['13-17','18-24','25-34','35-44','45+']` and `GENDERS = ['female','male','other']` in shared constants (validation + UI labels).

## 4. tRPC procedures

### 4.1 Creator (creatorProcedure, ownership-checked)
1. `creator.setAudience({ socialAccountId, topCountries: [{code,pct}], ages?, gender? })`: validates the account belongs to caller; derives `audienceTopCountry = topCountries[0].code`; stores Json breakdowns; sets `audienceSource='self_declared'`, `audienceVerified=false`, `audienceVerifiedAt=null`. (Editing resets verification, like metrics.)
2. Extend the social-account `select` in `CREATOR_CARD_INCLUDE` + the profile includes to return the audience fields.

### 4.2 Search + Match (shared `buildCreatorWhere`)
3. Add **`audienceCountry?`** to `CreatorFilter` → `where.socialAccounts.some({ audienceTopCountry: audienceCountry })`. Both `search.creators` and `match` inherit it.
4. Add `audienceCountry` to `searchInput`, the match `criteriaSchema`/`ParsedCriteria`, and the LLM parse prompt ("audiencia en MX" → `audienceCountry: 'MX'`).

### 4.3 Match scoring (Phase-2 hook)
5. Add an **audience component** to `matchScore`: `audience` = 1 if any account's `audienceTopCountry` matches `criteria.audienceCountry` (or unspecified) else 0. Rebalance weights (e.g. niche .35, reach .2, engagement .15, audience .2, contentType .05, country .05) — documented + tunable. Requires passing per-account audience countries into `ScoreCandidate`.

### 4.4 Admin
6. `admin.verifyAudience({ socialAccountId })` → `audienceVerified=true`, `audienceSource='admin'`, `audienceVerifiedAt=now`; `unverifyAudience` reverses. (Extends the existing verify flow.)

## 5. Web implementation
1. **Audience editor** (`/dashboard/profile`, per social account): under each account, a compact form — top-3 country selects + pct, age bands, gender split. Saves via `setAudience`. Show "audiencia declarada / verificada" state.
2. **Media-kit / profile display** (`/c/[username]`): an **Audiencia** section per account (or a blended summary): top countries (with %), gender split bar, age bands, and an **"Audiencia verificada"** badge when verified. Honest labeling when only self-declared.
3. **Search + match filters:** add **audience country** to `<CreatorFilters>` ("Audiencia en…") → feeds `audienceCountry`. Distinct from the existing creator-country filter.
4. **Admin:** add verify/unverify audience to the admin creators tab (next to metric verification).

## 6. Build order
| # | Block | Depends on |
|---|-------|-----------|
| 1 | §2 schema + §3 constants + migration | — |
| 2 | §4.1 setAudience + payload includes | 1 |
| 3 | §4.2 audienceCountry in buildCreatorWhere + search/match inputs | 1 |
| 4 | §4.3 matchScore audience component | 3 |
| 5 | §4.4 admin verify | 1 |
| 6 | §5.1 audience editor | 2 |
| 7 | §5.2 kit/profile display | 2 |
| 8 | §5.3 audience filter in CreatorFilters | 3 |

When 1→8 are green: creators declare audience, brands filter/match on audience country and see demographics + an authenticity badge.

## 7. Risks / call-outs
1. **Self-declared trust:** label clearly ("declarado por el creador") vs verified, so brands aren't misled — the badge is the trust signal, not the raw numbers.
2. **pct validation:** country/age/gender percentages should sum ≈100; validate loosely (warn, don't hard-block) for v1.
3. **`audienceTopCountry` denormalization** must be re-derived whenever `topCountries` changes (single write path in `setAudience`).
4. **matchScore weight rebalance** changes Phase-2 ranking — confirm the new weights; keep audience optional so briefs without an audience criterion are unaffected.
5. **Provider tier (backlog):** when Phyllo is added, it just sets `audienceSource='provider'` + a numeric score column — no migration to the v1 shape.

> Next: **Step 3 — checklist**, then code review (schema, the shared filter/score touch-points, profile/editor surfaces).
