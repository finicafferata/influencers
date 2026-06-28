# Audience Data & Quality — Product Vision (Step 1)

*Phase 3 of the feature roadmap · Date: 2026-06-07 · Status: Draft for human review*

## 0. How to read this
Step 1 = product vision, grouped **Essential → Desired**. No implementation detail. Goal: agree on what we're building and why.

## 1. Vision statement
> Show brands **who a creator actually reaches** — audience geography, age, gender — and **how real that audience is** (an authenticity signal). Brands buy audiences, not creators; this is the trust layer that makes CreatorLink a buying tool, not just a directory.

Today a creator's profile shows *their* country and *their* follower counts. A brand running a Mexican skincare campaign doesn't just need a Mexican creator with 100k followers — they need a creator whose **audience** is mostly women, 18–34, in Mexico, and not padded with bots. Audience data is the single biggest trust lever in influencer marketing, and the schema already anticipates it (`verified`/`verificationSource`/`verifiedAt` on each social account).

## 2. Approach decision — budget-conscious & phased
- **Ship now (zero per-lookup cost):** structured **self-declared audience demographics** per social account (top countries, age bands, gender split) + an **admin-verifiable authenticity badge** — same phased-trust pattern as metric verification. Surfaced on the media kit and as **search/match filters/criteria** (the brand-facing value).
- **Layer later (paid, schema-ready):** real audience data + authenticity scores via a **provider** (Phyllo / Modash / HypeAuditor) or platform **OAuth** — sets a different `source`, no schema churn. Pulled forward when there's demand + inventory worth the per-lookup spend.
- **Why:** delivers the demographics + filtering UX (what brands actually want) immediately at no marginal cost, while architecting for verified data when the budget and traction justify it. Mirrors how we shipped metric verification.

## 3. Who & the job
- **Brand / agency:** *"Don't show me the creator's location — show me the audience's. And tell me it's real."*
- **Creator:** *"Let me prove my audience fits — surface my real demographics so the right brands find me."*
- **Platform:** audience-fit + authenticity is the differentiator that justifies premium positioning and unlocks the Phase-4 campaign/payments layer.

## 4. Current state
| Piece | State |
|-------|-------|
| `SocialAccount.verified/verificationSource/verifiedAt` | ✅ Built — the trust hooks (designed for this) |
| Per-account follower/engagement metrics | ✅ Built |
| Audience demographics (geo/age/gender) | ❌ None |
| Authenticity / fake-follower signal | ❌ None |
| Audience filters in search / criteria in match | ❌ None (filters are on creator country, not audience) |
| Provider / OAuth data integration | ❌ None (Phase-3 "later" tier) |

**Implication:** the trust scaffolding exists; the net-new is **structured audience data per account, its display, and audience-aware search/match** — deliverable now self-declared, verifiable by admin, and provider-ready.

## 5. Feature groups — Essential → Important → Desired

### 🟥 Essential
- **E1 — Audience demographics per social account:** structured **top countries**, **age bands**, **gender split** (self-declared by the creator). Per account (each platform has its own audience).
- **E2 — Audience on the media kit / profile:** render demographics clearly (the thing brands scan for fit) with an **authenticity/verification state**.
- **E3 — Audience-aware discovery:** search filter + match criterion on **audience country** (and ideally gender/age) — "creators whose *audience* is mostly in MX", not just creators located in MX.
- **E4 — Authenticity signal (phase-1):** an admin-verifiable "audiencia verificada" badge + a simple quality state; architected for a future numeric score.

### 🟧 Important
- **I1 — Creator audience editor:** guided UI to enter demographics (or import from a platform-insights screenshot, reusing the verification pattern).
- **I2 — Match scoring uses audience fit:** add an audience-fit component to `matchScore` (Phase-2 hook) when audience data exists.
- **I3 — Admin audience verification:** review + verify audience data (extends the existing admin verify flow).
- **I4 — "Audience verified only" filter** (once inventory exists — mirrors the deferred `verifiedOnly`).

### 🟩 Desired (backlog — the "later/paid" tier)
- **D1 — Provider integration** (Phyllo/Modash/HypeAuditor): real demographics + **numeric authenticity / fake-follower %**.
- **D2 — Platform OAuth** for first-party audience insights.
- **D3 — Audience overlap / brand-fit modeling** across a shortlist.
- **D4 — Historical audience trends.**
- **D5 — Lookalike audiences.**

## 6. Success metrics
- **Trust:** contact/acceptance rate on audience-verified vs. unverified creators.
- **Coverage:** % of published creators with audience data; % audience-verified.
- **Demand:** % of searches/briefs that use an audience filter/criterion.
- **Conversion lift:** brief→contact when audience-fit is in the match score (I2).

## 7. Open questions for human review
1. **Self-declared first?** Confirm we ship self-declared + admin-verified now and defer paid providers (recommended, budget-consistent) — or is verified-only data table-stakes for brand trust from day one?
2. **Granularity:** top-N countries + a few age bands + binary/triple gender split — enough for v1? (vs. full distributions.)
3. **Per-account vs aggregated:** store audience per social account (accurate) and show a blended profile-level view, or just per-account?
4. **Audience filters in v1:** audience **country** only (simplest, highest-value), or also gender/age in the first cut?
5. **Authenticity now:** ship the badge (qualitative) in v1 and defer the numeric score to the provider tier — confirm.
6. **Provider choice (for the backlog):** name a preferred provider + a per-lookup budget so D1 is ready when triggered.

> Review §5 tiers + the questions. Then Step 2 — detailed implementation (audience schema per account, editor, profile/kit display, audience-aware search+match, admin verify).
