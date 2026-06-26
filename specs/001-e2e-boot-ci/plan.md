# Implementation Plan: E2E Boot CI & Core-Loop Tests

**Branch**: `001-e2e-boot-ci` | **Date**: 2026-06-20 | **Spec**: [spec.md](./spec.md)

## Summary

Add an automated gate that proves the app boots from a clean clone and that the
brand→creator heartbeat works end-to-end. Two deliverables: (1) a Playwright e2e suite
in `apps/web` covering auth + the core loop, with deterministic programmatic login;
(2) a CI job that provisions Postgres, migrates, seeds, builds, boots the API+web via
the `tsx`-based dev path, and runs the suite — blocking merge on failure.

## Technical Context

**Language/Version**: TypeScript; Node (TS-aware runtime: Node 24 native or `tsx` loader, already wired into `apps/api` `dev`).

**Primary Dependencies**: NestJS, Next.js 15, Prisma, tRPC, Turbo, pnpm; **Playwright** (new, e2e).

**Storage**: PostgreSQL (CI service container `postgres:16`).

**Testing**: Jest (existing unit, API) + Playwright (new, e2e).

**Project Type**: web (monorepo: `apps/api`, `apps/web`, `packages/*`).

**Constraints**: e2e must run unattended (no human reading a magic link) → read token from DB. Chromium-only for MVP.

**Scale/Scope**: Single core-loop journey + auth round-trip; ~3 spec files of seeded fixtures.

## Constitution Check

| Principle | How this plan complies |
|-----------|------------------------|
| I. Boots from clean clone | This IS the enforcement mechanism. |
| II. No committed type errors | CI runs `pnpm build` before e2e; fails on type errors. |
| III. Core loop always green | Adds the core-loop e2e the principle requires. |
| IV. AuthZ on every procedure | Not directly; tracked in a later spec (security audit). Noted, not blocked. |
| V. Optional means optional | Boot job runs with no Google/LLM/email keys; asserts no crash (FR-007). |

## Approach & Key Decisions

1. **Where Playwright lives**: in `apps/web` (it drives the browser + same-origin proxy
   to the API). A root `test:e2e` script fans out via Turbo.
2. **Deterministic auth**: a Playwright fixture calls `POST /auth/magic-link`, then reads
   the freshest `MagicLinkToken` for that email straight from Postgres (Prisma), and
   navigates to `/auth/verify?token=…`. No log scraping, no email. This is the linchpin
   for unattended runs (FR-005).
3. **Booting in CI**: reuse the working dev path (`pnpm --filter api dev`, `--filter web dev`)
   rather than `node dist/main` (which is currently broken by raw-TS deps — see punchlist
   §2.2). `start-server-and-test` (or Playwright `webServer`) waits for ports 3002/3000.
4. **DB in CI**: `services: postgres:16`; `DATABASE_URL` points at it; run
   `db:generate → migrate:deploy → prisma db seed` before tests.
5. **Selectors**: prefer role/text selectors that already exist in the UI (e.g. "Buscar
   creadores", creator handles, "Aceptar"); add `data-testid` only where the DOM is
   ambiguous, in the same PR.

## Project Structure

```text
apps/web/
├── playwright.config.ts        # NEW — webServer (api+web), baseURL :3000, chromium
├── e2e/
│   ├── fixtures/auth.ts        # NEW — programmatic magic-link login fixture
│   ├── auth.spec.ts            # NEW — US3: login happy path + reused-token reject
│   └── core-loop.spec.ts       # NEW — US2: brand search→contact→creator accept
└── package.json                # +test:e2e, +@playwright/test, +pg/prisma access

.github/workflows/ci.yml         # EXTENDED — new `e2e` job (postgres, migrate, seed, boot, playwright)
specs/001-e2e-boot-ci/           # this spec
```

## Phasing

- **Phase 0 — Boot gate (US1)**: CI job that boots the API against seeded Postgres and
  asserts magic-link issuance. Smallest shippable slice; delivers the highest-value guarantee.
- **Phase 1 — Auth e2e (US3)**: Playwright + login fixture + auth spec.
- **Phase 2 — Core-loop e2e (US2)**: the heartbeat journey; may add `data-testid`s.
- **Phase 3 — Wire into CI as a blocking gate** + de-flake (5x green).
