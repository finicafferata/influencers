# CreatorLink Constitution

## Core Principles

### I. It Must Boot From a Clean Clone (NON-NEGOTIABLE)
Every change must keep the app runnable from a fresh checkout following
`docs/LOCAL-DEV.md`: `install → db:generate → migrate → seed → build → boot API → boot web`.
CI enforces this on every PR. A change that breaks the documented boot path is a
release blocker, regardless of how small. (This principle exists because the MVP
repeatedly shipped confident docs over code that did not run on the current toolchain.)

### II. No Committed Type Errors or Broken WIP
`pnpm build` (which runs `tsc`/`nest build` across all workspaces) must pass before
merge. No untracked-but-required files, no `as any` to silence real type failures.
The CI typecheck gate is mandatory.

### III. The Core Loop Is Always Green (Test-First for the Heartbeat)
The brand→creator "heartbeat" (sign in → search → contact → accept) must have an
automated end-to-end test that passes on every PR. New features that touch this
loop add or update its e2e coverage in the same PR. Pure functions (scoring,
query-building, aggregates) get unit tests.

### IV. Authorization on Every Procedure
Every tRPC procedure and API route declares its access level explicitly
(public / authenticated / role-scoped / admin). A new endpoint without an explicit
guard is treated as a bug. Public routes must be verified to leak no private data.

### V. Optional Means Optional
Features gated behind config (LLM key, Google OAuth, email provider) MUST degrade
gracefully when that config is absent — never crash at boot. The documented
"works without X" paths must be exercised by tests.

## Technology Constraints

- **Stack**: pnpm + Turbo monorepo; NestJS API (`apps/api`), Next.js web (`apps/web`),
  Prisma/Postgres (`packages/db`), tRPC (`packages/trpc`).
- **Runtime**: Pin one Node version across local + CI (currently the app requires a
  TS-aware runtime — Node 24 native or the `tsx` loader — because workspace packages
  ship raw `.ts`). Either commit to that or add a build step; do not leave it implicit.
- **Database**: All schema changes go through Prisma migrations (no manual DDL).
  Seed data stays runnable and representative of the core-loop test fixtures.

## Development Workflow & Quality Gates

1. Spec-driven: substantial work starts as a Spec Kit spec (`/speckit-specify`),
   then `/speckit-plan` → `/speckit-tasks` → `/speckit-implement`.
2. Every PR must pass: install · typecheck/build · lint · unit tests · **E2E boot +
   core-loop suite**.
3. MVP launch gate: the boot CI is green, the core-loop e2e passes, and an
   authorization audit (Principle IV) is complete.

## Governance

This constitution supersedes ad-hoc practice. Any PR that weakens a quality gate must
say so explicitly and justify it. Amendments are made by editing this file with a
version bump and a one-line rationale.

**Version**: 1.0.0 | **Ratified**: 2026-06-20 | **Last Amended**: 2026-06-20
