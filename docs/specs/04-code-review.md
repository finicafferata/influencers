# CreatorLink — Step 4: Code Review (current repo vs. Slice 1 plan)

*Step 4 of the product workflow · Date: 2026-06-07 · Status: Findings for human review*
*Audited against `03-search-slice-checklist.md` Blocks 1–8, grounded in actual file contents.*

---

## TL;DR

The **foundation is real and good**: monorepo, NestJS auth (magic-link + Google), full Prisma schema, tRPC wiring, throttling, CORS-with-credentials, a working seed, and an auth test suite. But the **entire feature layer is absent** — the tRPC app router exposes only `health`, the `packages/ui` library is empty, and the web app is still the Next.js starter template plus a couple of auth pages.

The audit also surfaced **three concrete pre-existing bugs in the auth path** that Step 2 only partially anticipated (see §Cross-cutting). These must be fixed in Block 1 or the whole slice fails silently.

Legend: ✅ exists & usable · 🟡 exists but must be modified · ❌ missing.

---

## Cross-cutting findings (read first — these bite Block 1)

### 🔴 CC-1 — Session cookie lives on the wrong origin for tRPC
- **Google OAuth** sets the `session` cookie via `res.cookie(...)` on the **API origin** (`auth.controller.ts`).
- **Magic-link** returns the JWT in the response body; the **Next.js** route (`/api/auth/verify/route.ts`) sets the `session` cookie on the **web origin**.
- But the browser tRPC client (`TrpcProvider.tsx`) and the server client (`lib/trpc/server.ts`) call the API **directly** at `NEXT_PUBLIC_API_URL/trpc` (port 3001) — a *different* origin from the web app.
- **Result:** the magic-link cookie (web origin) is never sent to the API; and neither tRPC link sets `credentials: 'include'`, so even the API-origin cookie won't be attached. CORS `credentials: true` is correctly set in `main.ts`, so half the plumbing is done — but the client side and the magic-link cookie origin are not.
- **Fix in Block 1:** standardize where the session cookie is issued (API origin in both flows), add `fetch` with `credentials: 'include'` to both tRPC links, and parse the `Cookie` header in the tRPC context. *Alternative:* proxy tRPC through a Next.js route handler so the cookie is forwarded server-side.

### 🟡 CC-2 — `isNewUser` is computed two inconsistent ways
- Google callback: `isNewUser = !creatorProfile && !orgMember` (relation-based, correct).
- Magic-link (`auth.service.ts`): `isNewUser = !record.user.name` (fragile — a named user with no role reads as returning).
- **Fix:** unify on the relation-based check; this is exactly the logic `me.bootstrap` (§2.4 / Block 1) should own. Both auth paths should defer to it.

### 🟡 CC-3 — Routes already referenced but not built
- Google callback redirects to `/onboarding/role` (new) and `/dashboard` (returning). **Neither route exists.** Good news: the contract Block 4 must satisfy is already pinned down by the backend.

---

## Block 1 — Auth foundation 🔴 blocks everything

| Item | State | Notes |
|------|-------|-------|
| tRPC context resolves `userId` | ❌ | `trpc.router.ts` hardcodes `userId: undefined`. Must parse `session` cookie + verify JWT |
| Shared `verifyJwt()` helper | ❌ | Only `JwtStrategy` (passport, Bearer) exists; tRPC needs cookie-based verify. Extract one helper |
| Web→API credential forwarding | 🟡 | CORS `credentials:true` ✅ in `main.ts`; tRPC links missing `credentials:'include'` (see CC-1) |
| `me.bootstrap` (role resolution) | ❌ | Not built; should also absorb CC-2 |
| `creatorProcedure` / `orgProcedure` | ❌ | Only `publicProcedure` + a correct-but-unreachable `protectedProcedure` exist in `trpc.ts` |
| `adminProcedure` | ❌ | `User.isAdmin` exists; no middleware |
| cookie-parser on NestJS | 🟡 | Not present; `handleRequest` copies headers so the Cookie header can be parsed manually |

**Verdict:** the cleanest building block is in place (`protectedProcedure` is written correctly) but it is **currently unreachable** because the context never sets `userId`. This block is the critical path.

---

## Block 2 — Schema deltas 🟡

| Field / change | State | Notes |
|----------------|-------|-------|
| `CreatorProfile.published` | ❌ | Add (default false) |
| `CreatorProfile.tags` | ❌ | Add `String[]` |
| `CreatorProfile.headline` | ❌ | Add |
| `CreatorProfile.maxFollowers` | ❌ | Add (denormalized) |
| `SocialAccount.verified` / `verificationSource` / `verifiedAt` | ❌ | Add (phased verification) |
| Search indexes (GIN niches/tags, btree country/contentType/maxFollowers/published) | ❌ | Add; GIN needs raw migration |
| Niche controlled-vocab constant | ❌ | New shared constant `{slug, labelEs}[]` |
| `Contact` / `Notification` models | ✅ | Already sufficient — no change |

**Verdict:** existing schema is solid and richer than the slice needs (List/Favorite/Roster/Manager already modeled for later). All deltas are **additive** — low-risk migration.

---

## Block 3 — Core routers (me / creator / org) ❌

| Router | State |
|--------|-------|
| `creator.*` (getMine, upsertProfile, social CRUD, publish/unpublish, getByUsername) | ❌ all missing |
| `org.*` (create, getMine) | ❌ all missing |
| `me.bootstrap` | ❌ missing |

**Verdict:** `root.ts` mounts only `healthRouter`. The entire creator/org API is greenfield. No conflicts to work around — pure additive build.

---

## Block 4 — Onboarding & profile UI 🟡 mostly missing

| Screen | State | Notes |
|--------|-------|-------|
| `/onboarding/role` | ❌ | Referenced by Google callback; must exist |
| `/onboarding/creator` (4-step) | ❌ | — |
| `/dashboard/profile` (edit) | ❌ | — |
| `/c/[username]` (public profile) | ❌ | — |
| `/onboarding/org` | ❌ | — |
| `/dashboard` | ❌ | Referenced by both auth flows; must exist (even if a stub) |
| Landing page (dual CTA) | 🟡 | `page.tsx` is the **default Next.js template** — needs replacement |
| Login / verify pages | ✅ | `(auth)/login`, `(auth)/auth/verify` exist and call the auth API |
| `packages/ui` primitives + Storybook | 🟡 | Storybook configured; `ui/src/index.ts` is empty (`export {}`). All components to build |

**Verdict:** auth entry pages exist; everything past login is missing. UI library is an empty shell ready to fill.

---

## Block 5 — Search router + query ❌

| Item | State |
|------|-------|
| `search.creators` procedure | ❌ |
| where-clause builder / relation filters / cursor pagination | ❌ |
| (decision) no `verifiedOnly` input | n/a — nothing built yet |

**Verdict:** greenfield. Depends on Block 2 fields (`maxFollowers`, `published`, indexes) and Block 1 (`orgProcedure`).

---

## Block 6 — Search & creator-card UI ❌

All missing (`/search`, filters, card grid, card drawer/modal). Depends on Block 5 + `packages/ui` primitives.

---

## Block 7 — Contact + notifications ❌ (schema ✅)

| Item | State | Notes |
|------|-------|-------|
| `contact.*` procedures | ❌ | `Contact` model ✅ with `campaignBrief` + `status` |
| `notification.*` procedures | ❌ | `Notification` model ✅ |
| Contact modal / inbox / bell UI | ❌ | — |
| Throttling for contact abuse | ✅ partial | `ThrottlerModule` global guard (limit 5/60s) exists; tune per-procedure later |

**Verdict:** data layer ready; all procedures and UI to build. Throttling foundation is a nice freebie.

---

## Block 8 — Admin seed + verify 🟡 partially done

| Item | State | Notes |
|------|-------|-------|
| Seed creates admin + sample creator + brand org | ✅ | `seed.ts` already does this (María García, AR, social accounts, rates; "Cosmética Natural SA") |
| Seed uses controlled-vocab niche **slugs** | 🟡 | Seed stores Spanish **labels** (`['Belleza','Lifestyle']`) directly — must migrate to slugs once the taxonomy constant lands |
| Seed sets new fields (`published`, `maxFollowers`, `verified`) | 🟡 | Must update seed after Block 2 migration |
| `admin.createCreatorProfile` / `listUsers` / `suspendUser` / `listContacts` | ❌ | Not built |
| `admin.verifySocialAccount` | ❌ | Not built |
| `/admin` screen | ❌ | Not built |

**Verdict:** seeding is already partly real — a genuine head start for hand-seeding inventory — but it predates the taxonomy + new fields and will need a small rework.

---

## i18n 🟡

- No i18n library wired; existing pages mix English (landing template) and the seed has Spanish content.
- **Action:** establish `es` as default + a string dictionary before building Block 4 screens, so copy isn't retrofitted.

---

## Testing posture ✅ foundation / ❌ features

- ✅ Auth has real specs: `auth.service.spec`, `auth.controller.spec`, `google.strategy.spec`, `email.service.spec`, plus `app.e2e-spec`.
- ❌ No tests for feature procedures (none exist yet). The Step 3 testing targets are all net-new.
- **Good sign:** the project already has a unit + e2e harness (Jest), so Step 9's test items have a home.

---

## Summary scorecard

| Block | Exists | Modify | Missing | Critical path? |
|-------|:------:|:------:|:-------:|:--------------:|
| 1 — Auth foundation | partial | CC-1/2/3 | context, helpers, middlewares | 🔴 yes |
| 2 — Schema deltas | base ✅ | — | 8 additive changes | 🔴 yes |
| 3 — Core routers | — | — | all | high |
| 4 — Onboarding UI | login/verify ✅ | landing, UI lib | 6 screens | high |
| 5 — Search router | — | — | all | high |
| 6 — Search UI | — | — | all | med |
| 7 — Contact/notifs | schema ✅ | — | procedures + UI | med |
| 8 — Admin seed/verify | seed ✅ | seed rework | admin procs + screen | low |

**Net:** ~15% built (foundation + auth + schema + seed + tests), ~85% to build — but the missing 85% is overwhelmingly **additive greenfield**, not refactor. The only true *modifications* are the three auth bugs (CC-1/2/3), the seed reconciliation, and replacing the template landing page.

> Next: **Step 5 — per-task specs.** I'll write a detailed spec for each task (one per checklist block / sub-feature), each with a human-review section, ready to become epics + issues in Step 6.
