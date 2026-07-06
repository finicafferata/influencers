# CreatorLink — Project Summary

*A LATAM, Spanish-first, two-sided creator marketplace. This file is the high-level map of the planning + implementation work in `docs/specs/`.*

---

## Starting point

A Turborepo (Next.js 15 + NestJS + tRPC v11 + Prisma/Postgres) with the scaffold, auth (magic-link + Google), and a full Prisma schema already in place — but an **empty tRPC layer** (only `health`), a **template frontend**, and three latent auth bugs.

## Decisions locked (product)

| Topic | Decision |
|-------|----------|
| Wedge | Balanced two-sided loop (publish → discover → contact) |
| Market | LATAM, Spanish-first |
| First slice | Creator Discovery & Search (E1–E7) |
| Verification | Phased — self-report + admin "Verificado" badge now; OAuth/provider later |
| Contact | In-app (notification + inbox), no email this slice |
| Rates | Public on the profile |
| Niche taxonomy | Dual — controlled vocab (filters) + free tags |
| Seeding | Admin hand-seed first |

---

## Workflow & deliverables (your 9 steps)

| Step | Output | Location |
|------|--------|----------|
| 1 — Product vision | Essential → Desired vision | `01-mvp-product-vision.md` |
| 2 — Implementation plan | Point-by-point build plan | `02-search-slice-implementation.md` |
| 3 — Checklist | 8 dependency-ordered blocks | `03-search-slice-checklist.md` |
| 4 — Code review | What exists / modify / missing | `04-code-review.md` |
| 5 — Per-task specs | 8 specs + index | `tasks/` |
| 6 — Epics & issues | 5 epics, 44 issues, backlog | `epics/` |
| — Independent review | Reversed the auth approach + 6 fixes | `REVIEW-01-independent-review.md` |
| 7 — Implementation | Full backend + frontend | the codebase |
| 9 — Manual test plan | E2E checklist | `09-manual-test-checklist.md` |

## Independent review — the big catch

A read-only reviewer confirmed the three auth bugs and found that the planned **cross-site session cookie would break in production** on Vercel (web) + Railway (api). We reversed to a **first-party Next.js tRPC proxy**, removed `isNewUser` in favor of `me.bootstrap`, added DB-level contact dedupe, suspended-user rejection in context, `maxEngagement` denormalization, IDOR/rate-limit hardening, and a capability constant.

---

## What was built (Step 7)

### Backend (5 epics)
- **Schema + migration:** `published`, `tags`, `headline`, denormalized `maxFollowers`/`maxEngagement`; social `verified`/`verificationSource`/`verifiedAt`; B-tree + GIN + trigram indexes; partial-unique contact dedupe index.
- **Auth foundation:** cookie→context identity, `protectedProcedure` (rejects suspended), `creatorProcedure`, validated `orgProcedure(capability)`, `adminProcedure`, `me.bootstrap` (sole routing authority), Next.js tRPC proxy, logout, Google first-party callback bridge.
- **Routers:** `creator` (profile lifecycle, social CRUD, publish gate, public profile), `org`, `search` (where-builder, keyset cursor, total, trigram `q`), `contact` (atomic send + DB dedupe + ownership + rate limit), `notification`, `admin` (seed, verify badge, suspend+unpublish, lookup).
- **Recompute extension** keeps denormalized columns in sync via one write path; seed reconciled to slugs with 3 published creators.

### Frontend
i18n dictionary + format helpers, a shared UI primitive set (in-app), and all screens: landing (dual CTA), role selection, 4-step creator onboarding wizard (autosave + publish), profile editor, SSR public profile (public rates, verified badge), org onboarding (Slice-1 types only), search (URL-synced filters, infinite scroll, creator-card drawer), contact modal, creator inbox (accept/decline), notification bell, and a 3-tab admin panel (seed + verify + suspend/contacts).

---

## Quality passes (all findings fixed)

1. **Independent spec review** — reversed auth architecture, +6 fixes.
2. **Backend audit** — caught the critical NestJS body-parser bug (was killing every tRPC mutation) + rate-limit gap + IDOR/org-capability issues.
3. **Frontend audit** — confirmed shape matches; fixed `useInfiniteQuery` typing.
4. **Late-additions audit** — clean; hardened a pre-existing admin-tab crash.
5. **Full-repo compile hunt** — fixed `@repo/db` dep classification, a `useSearchParams` Suspense boundary, and a Prisma `Json`/optional-currency type issue.

---

## Status & how to run

Steps 1–7 complete. **Step 8 (code review)** and **Step 9 (manual E2E)** are owner-driven, using `09-manual-test-checklist.md`.

```bash
pnpm install
pnpm --filter @repo/db db:generate
pnpm --filter @repo/db db:migrate
pnpm --filter @repo/db db:seed
pnpm dev   # web :3000, api :3001
```

**Heartbeat test:** log in as `brand@example.com` → `/search` → open a creator → send a contact → log in as that creator → notification + inbox → accept.

> Build note: the implementation environment couldn't run `pnpm install`/`tsc`, so the first local `pnpm build` may surface a minor type nit despite the compile-hunt pass.

---

## Known follow-ups / backlog

- Real magic-link **email delivery** (currently logged in dev).
- **Avatar upload** (URL-only for now).
- **Redis-backed rate limiting** (in-memory = single-instance today).
- Extract UI primitives to **`packages/ui` + Storybook**.
- **Slice 2:** lists/favorites, saved searches, talent-agency roster; then OAuth verification, messaging, reviews, payments (see `epics/BACKLOG.md`).
