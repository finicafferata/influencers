# Tasks: E2E Boot CI & Core-Loop Tests

**Input**: [spec.md](./spec.md), [plan.md](./plan.md)

**Format**: `[ID] [P?] [Story] Description` — [P] = parallelizable (different files).

**Status (2026-06-20)**: Phases 0–2 implemented and verified locally (5/5 green, re-runnable).
Remaining: T030 (mark the e2e check required in GitHub branch protection) and T032
(LOCAL-DEV doc update). Note: the e2e job is intentionally not gated on `next build`
until MVP-PUNCHLIST §2.7 (broken web build) is fixed.

## Phase 0: Boot gate (US1) — highest value, ship first

- [ ] T001 [US1] Extend `.github/workflows/ci.yml` with an `e2e` job: `postgres:16`
  service, `DATABASE_URL` env, Node pinned to the TS-aware version.
- [ ] T002 [US1] In the job: `pnpm install --frozen-lockfile` → `db:generate` →
  `db:migrate:deploy` → `prisma db seed`.
- [ ] T003 [US1] Boot the API (`pnpm --filter api dev`) with NO Google/LLM/email env;
  wait for `/` to respond; assert `POST /auth/magic-link` returns success (FR-001/002/003/007).
- [ ] T004 [US1] Fail-fast: run `pnpm build` earlier in the job so type errors block
  before boot (Constitution II).

## Phase 1: Auth e2e (US3)

- [ ] T010 [US3] Add `@playwright/test` to `apps/web`; `apps/web/playwright.config.ts`
  with `webServer` starting api+web, `baseURL http://localhost:3000`, chromium project.
- [ ] T011 [US3] Add root `test:e2e` script + Turbo `test:e2e` task; ensure Playwright
  browsers install step in CI.
- [ ] T012 [US3] `apps/web/e2e/fixtures/auth.ts`: `loginAs(email)` — POST magic-link,
  read freshest `MagicLinkToken` via Prisma, visit `/auth/verify?token=…`, assert session.
- [ ] T013 [US3] `apps/web/e2e/auth.spec.ts`: happy-path login routes by role; reused
  token is rejected (acceptance scenarios US3-1, US3-2).

## Phase 2: Core-loop e2e (US2)

- [ ] T020 [US2] Map the real UI flow (search route, creator card, contact modal,
  proposals inbox, accept button); add `data-testid` only where selectors are ambiguous.
- [ ] T021 [US2] `apps/web/e2e/core-loop.spec.ts`: login as brand → `/search` lists
  seeded creators (US2-1).
- [ ] T022 [US2] …open a creator → send message + brief → assert confirmation + persistence (US2-2).
- [ ] T023 [US2] …login as the targeted creator → open received proposals → unread shows →
  Aceptar succeeds (US2-3).

## Phase 3: Make it a blocking gate

- [ ] T030 Wire the e2e job to run on every PR to `main`; mark required.
- [ ] T031 De-flake: run the suite 5× (SC-002); add explicit waits/`data-testid` where needed.
- [ ] T032 Update `docs/LOCAL-DEV.md` with `pnpm test:e2e` and the Node/runtime note.

## Dependencies

- T001–T004 are independent of Playwright and can ship first (Phase 0 = MVP boot gate).
- T012 (login fixture) blocks T013, T021–T023.
- T020 (selector mapping) blocks T021–T023.
- T030 depends on Phases 0–2 being green.
