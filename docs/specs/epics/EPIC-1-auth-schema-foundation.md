# EPIC-1 — Auth & Schema Foundation

*Status: Draft · Wraps TASK-01, TASK-02 · Critical path 🔴 · Blocks: all other epics*

## Goal
Make the tRPC layer authenticated and the data model search-ready. Fix the three pre-existing auth bugs (CC-1/2/3). Nothing else can be built until this is green.

## Definition of Done (Gate B)
A logged-in browser session authorizes through tRPC; role middlewares gate correctly; `me.bootstrap` returns the right role; the migration is applied and the seed produces a published creator with slug-based niches and correct `maxFollowers`.

---

### ISS-1.1 — Shared `verifyJwt()` helper · `S`
Extract one JWT verify helper used by both the passport strategy and the tRPC context.
**Acceptance:** valid token → `{sub,email}`; expired/garbage → null; one implementation, two callers.
**Deps:** none. **Review:** no duplicate verify logic remains.

### ISS-1.2 — Resolve `userId` in tRPC context · `M`
Parse the `session` cookie (fallback Bearer) in `createContext`, verify via ISS-1.1, set `ctx.userId`.
**Acceptance:** authenticated request populates `userId`; anonymous leaves it undefined; `protectedProcedure` now reachable.
**Deps:** ISS-1.1. **Review:** cookie parsed from the copied headers; no secret logged.

### ISS-1.3 — Role middlewares (`creator`/`org`/`admin`Procedure) · `M`
Add the three middlewares in `trpc.ts`, attaching `creatorId` / `{orgId,capabilities}` to ctx.
**Acceptance:** each authorizes the right role and rejects others with `FORBIDDEN`.
**Deps:** ISS-1.2. **Review:** capability check is explicit; FORBIDDEN vs UNAUTHORIZED correct.

### ISS-1.4 — `me.bootstrap` · `M`
Protected query returning `{user, role, creatorProfile?, orgs[]}` with precedence admin > creator > org_member > none.
**Acceptance:** correct role for admin / creator-only / org-only / brand-new user.
**Deps:** ISS-1.2. **Review:** precedence matches spec.

### ISS-1.5 — Fix CC-1/CC-2: unify cookie + isNewUser · `M`
Issue the session cookie on the **API origin** for magic-link (stop setting it in the Next.js route); compute `isNewUser` via relations in both flows.
**Acceptance:** both login methods set one API-origin cookie; new-with-name user is correctly "new".
**Deps:** ISS-1.4. **Review:** Next.js verify route no longer sets the cookie; both flows defer to relation-based check.

### ISS-1.6 — tRPC links send credentials · `S`
Add `fetch` with `credentials:'include'` to the browser and server tRPC links.
**Acceptance:** authenticated tRPC call from the web origin succeeds end-to-end.
**Deps:** ISS-1.5. **Review:** CORS credentialed request verified in browser network tab.

### ISS-1.7 — Prisma schema deltas + migration · `M`
Add profile fields (`published`, `tags`, `headline`, `maxFollowers`), social verification fields, and indexes (btree + GIN via raw SQL).
**Acceptance:** migrate applies on clean + populated DB; GIN indexes present; client regenerated.
**Deps:** none (parallel with 1.1–1.6). **Review:** all additive; GIN raw SQL correct.

### ISS-1.8 — Taxonomy + platform constants · `S`
Niche `{slug,labelEs}[]` (+ slug Set, label map) and `PLATFORMS` constant, importable from web + api.
**Acceptance:** ~15–20 niches with Spanish labels; no circular deps.
**Deps:** none. **Review:** niche list approved (attach for sign-off).

### ISS-1.9 — Reconcile seed · `S`
Update `seed.ts`: slug-based niches, `published:true`, `maxFollowers`/`maxEngagement`, `self_reported` accounts.
**Acceptance:** `db:seed` yields a published María, `maxFollowers=120000`, slug niches.
**Deps:** ISS-1.7, ISS-1.8. **Review:** seed idempotent; goes through the recompute extension.

### ISS-1.10 — Next.js tRPC proxy (first-party cookie) · `M` · *REVIEW-01 C1*
Add `/api/trpc/[trpc]` route handler in web that forwards the `session` cookie to the API; point the browser tRPC link at it. Remove the dead cookie-set in the old verify route.
**Acceptance:** authenticated tRPC works in a cross-site (web≠api domain) setup; cookie stays first-party `SameSite=Lax`.
**Deps:** ISS-1.2. **Review:** no `credentials:'include'` cross-site dependence; proxy forwards cookie server-side.

### ISS-1.11 — Logout · `S` · *REVIEW-01 missing-scope*
`/api/auth/logout` (web) clears the first-party `session` cookie; UI sign-out action.
**Acceptance:** sign-out clears session; subsequent protected calls are UNAUTHORIZED.
**Deps:** ISS-1.10. **Review:** cookie cleared with same attributes.

### ISS-1.12 — Reject suspended users in context · `S` · *REVIEW-01 C4*
Context/`protectedProcedure` loads the user and rejects `suspended` with `FORBIDDEN`.
**Acceptance:** a suspended user's valid JWT no longer authorizes any protected call.
**Deps:** ISS-1.2. **Review:** check runs before any feature logic.

### ISS-1.13 — `CAPABILITIES` constant + validated `orgProcedure` · `S` · *REVIEW-01 moderate #7*
Shared `CAPABILITIES` constant; `orgProcedure(capability)` validates the requested capability against it.
**Acceptance:** unknown capability string throws at setup, not silently denies.
**Deps:** ISS-1.3, ISS-1.8. **Review:** no stringly-typed capability checks remain.

---

## Human review checklist (Gate A)
- [ ] Approve API-origin cookie model (TASK-01).
- [ ] Approve role precedence + FORBIDDEN/UNAUTHORIZED semantics.
- [ ] Approve schema deltas as additive (TASK-02).
- [ ] **Approve the niche taxonomy list** (Spanish labels).
- [ ] Confirm no refresh-token work in this slice.
