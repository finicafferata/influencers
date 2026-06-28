# REVIEW-01 — Independent Spec Review: Findings & Decisions

*Date: 2026-06-07 · Independent reviewer: staff-level product engineer (read-only audit) · Status: Decisions applied*

An independent reviewer audited specs 01–06 against the actual codebase before implementation. This file records the findings and the **decisions taken in response**. Where a decision changes a previously "locked" choice, it's marked **↻ REVERSAL**. The affected TASK/EPIC files have been edited to match; this doc is the rationale of record.

## Verdict (reviewer)
Planning is strong and correctly scoped, but **not safe to start Block 1 as written** — the auth fix would silently break in production. Fix auth + ~6 data-model/scope gaps first.

## Confirmed correct
CC-1, CC-2, CC-3 are all real and accurately diagnosed. Schema-is-additive holds. `protectedProcedure` is correct-but-unreachable. Seed stores Spanish niche labels (needs slug migration).

---

## Critical issues — decisions

### C1 ↻ REVERSAL — Auth: use a Next.js tRPC proxy (first-party cookie), NOT API-origin cross-site cookie
**Finding:** Vercel (web) and Railway (api) are different registrable domains. `SameSite=Lax` cookies (what the code uses everywhere) are not sent on cross-site `fetch`, so authenticated tRPC would 401 in prod. `SameSite=None` is increasingly blocked by Safari/Chrome.
**Decision:** Route browser tRPC through a Next.js route handler `/api/trpc/[trpc]` that forwards the first-party `session` cookie to the API server-side. Cookie stays `SameSite=Lax`, first-party, no CORS, no ITP exposure. The API still issues the JWT; the magic-link cookie is set by the **web** origin (first-party) — which is fine under the proxy model. **TASK-01 updated.**

### C2 — Kill `isNewUser`; `me.bootstrap` is the sole routing authority
**Finding:** `isNewUser = !user.name` is broken (role-less named users misclassified; Google name-prefill corrupts the signal).
**Decision:** Remove `isNewUser` from verify/callback responses. After login the client calls `me.bootstrap` and routes on `role === 'none'`. Auth flows no longer compute newness. **TASK-01 updated.**

### C3 — Contact dedupe must be a DB-level partial unique index
**Finding:** No `@@unique` on `Contact`; app-layer "exists?" check is racy.
**Decision:** Add a **partial unique index** `(fromUserId, toCreatorId) WHERE status='pending'` via raw SQL migration; `contact.send` runs in a transaction and relies on the constraint (catch unique-violation → `CONFLICT`). **TASK-02 + TASK-07 updated.**

### C4 — Reject suspended users in the tRPC context (JWT has no revocation)
**Finding:** 7-day JWT, no revocation list — a suspended user keeps full access until expiry. Also, search's suspended filter is a `User` relation not covered by `CreatorProfile` indexes.
**Decision:** (a) `protectedProcedure`/context loads the user and rejects `suspended` with `FORBIDDEN`. (b) Search excludes suspended via the relation filter AND we keep `published` as the primary indexed gate (a profile of a suspended user is also unpublished by an admin suspend action — `admin.suspendUser` will `unpublish` their profile too, so the indexed `published:false` covers the hot path). **TASK-01 + TASK-05 + TASK-08 updated.**

### C5 — Engagement sort: denormalize `maxEngagement` (keyset-stable)
**Finding:** No stable column to key an engagement cursor on; "representative account" is computed at query time → pagination dupes/skips.
**Decision:** Denormalize `CreatorProfile.maxEngagement Float @default(0)` alongside `maxFollowers`, maintained by the **same single write path**. Engagement sort + cursor key on `(maxEngagement, id)`. **TASK-02 + TASK-03 + TASK-05 updated.**

### C6 — IDOR / scraping hardening
**Findings & decisions:**
- `contact.updateStatus` must assert `contact.toCreatorId === ctx.creatorId` (not merely "is a creator"). Explicit test added. **TASK-07 updated.**
- Public `/c/[username]` + `creator.getByUsername` are unauthenticated and expose full rates (Q4) → **rate-limit `getByUsername`** (dedicated throttle) and accept public rates as a product decision (Q4 confirmed). **TASK-03 + TASK-05/throttle updated.**

---

## Moderate issues — decisions
1. **`verifiedOnly` contradiction:** doc 02 §4.4 is stale; the slice has **no `verifiedOnly`**. Doc 02 annotated as superseded by this review. ✅
2. **`maxFollowers`/`maxEngagement` drift:** make recompute a **Prisma client extension on `SocialAccount` writes**, not per-procedure — covers seed + admin paths too. **TASK-02/03 updated.**
3. **Cookie parsing:** specify explicit `session=` parse from the Cookie header (no `cookie-parser` dep). **TASK-01 updated.**
4. **`pg_trgm`:** add `CREATE EXTENSION IF NOT EXISTS pg_trgm` + trigram GIN index on `headline`/`username` to the TASK-02 migration; otherwise `q` is a seq scan. **TASK-02 updated.**
5. **Result count:** `search.creators` also returns `total` (count query) for "X creadores encontrados". **TASK-05 updated.**
6. **Representative-account rule:** `@@unique([creatorId,platform])` already resolves the platform-set case; ambiguity only in no-platform case → resolved by `maxEngagement` denorm (C5). ✅
7. **Capability constant:** add shared `CAPABILITIES` constant; `orgProcedure(capability)` validates against it (prevents typo-deny). **TASK-01/02 updated.**

---

## Missing scope — new issues added to epics
- **EPIC-1:** ISS-1.10 Next.js tRPC proxy · ISS-1.11 logout route + cookie clear · ISS-1.12 suspended-in-context · ISS-1.13 capability constant + validated `orgProcedure`.
- **EPIC-1/TASK-02:** trigram extension+index, partial-unique contact index, `maxEngagement` (folded into ISS-1.7).
- **EPIC-2:** ISS-2.14 i18n is now its own first-class issue (was implied) · ISS-2.15 avatar/image upload + storage (decision below).
- **EPIC-3:** per-route rate-limit tuning (search must not inherit the global 5/60s) folded into ISS-3.1; result `total` into ISS-3.2.
- **EPIC-5:** `admin.suspendUser` also unpublishes the profile (C4).

### Decisions on missing scope
- **Avatar/image upload:** MVP uses **URL fields + a single hosted-upload via a signed URL to object storage**. Decision: ship with **URL input now** (creator pastes an image URL; Google avatar auto-filled when present) and add direct upload as the first fast-follow. Keeps the slice unblocked without an S3/Cloudinary integration on the critical path. *(Flag for review.)*
- **Logout:** add `/api/auth/logout` (web) clearing the first-party cookie. In-slice.
- **Rate limiting:** keep global throttle but raise the default and add per-route overrides — search generous, `contact.send` tight, `getByUsername` moderate. In-slice.
- **i18n:** promoted to ISS-2.14, must land before Block-4 screens.
- **displayType vs capability mismatch:** for this slice, **org onboarding offers only `brand` and `marketing_agency`** (both `can_search_creators`). `talent_agency`/`hybrid` are hidden until the roster epic (backlog) — prevents onboarding into an unservable role. **TASK-04 updated.**
- **Accessibility & observability:** accessibility = baseline semantic HTML + labels (not a separate task); **basic structured logging on `contact.send`** added as the one observability hook for the "heartbeat" (in-slice, minimal). Full analytics → backlog.

---

## Nits (accepted)
Remove dead cookie-set in web verify route after C1; make `Organization.country` consistently optional in `org.create`; default sort documented as `followers`; CORS allowlist/regex for Vercel preview URLs (note for deploy, not slice-blocking).

> Net effect: auth architecture switched to the proxy model, 4 new EPIC-1 issues, 2 new EPIC-2 issues, several backend hardening items, and explicit decisions on avatar/logout/i18n/rate-limits. Implementation proceeds against the **revised** specs.
