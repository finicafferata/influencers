# CreatorLink — Slice 1 Task Specs (Step 5)

*Step 5 of the product workflow · Date: 2026-06-07 · Status: Draft for human review*

One spec per task, derived from the Step 3 checklist blocks and the Step 4 code review. Each spec is self-contained and ready to become an **epic + issues** in Step 6.

## Task index

| Task | Title | Critical path | Depends on |
|------|-------|:-------------:|------------|
| [TASK-01](TASK-01-auth-foundation.md) | Auth foundation (tRPC context, JWT, role middlewares) | 🔴 | — |
| [TASK-02](TASK-02-schema-deltas.md) | Schema deltas + niche taxonomy | 🔴 | — |
| [TASK-03](TASK-03-core-routers.md) | Core routers: me / creator / org | high | 01, 02 |
| [TASK-04](TASK-04-onboarding-ui.md) | Onboarding & profile UI + UI primitives | high | 03 |
| [TASK-05](TASK-05-search-router.md) | Search router + query builder | high | 02, 03 |
| [TASK-06](TASK-06-search-ui.md) | Search & creator-card UI | med | 04, 05 |
| [TASK-07](TASK-07-contact-notifications.md) | Contact + notifications (closes loop) | med | 05, 06 |
| [TASK-08](TASK-08-admin-seed-verify.md) | Admin seed + verification | low | 03 |

## Conventions used in every spec

- **Decisions locked:** phased verification (self-report + admin badge) · in-app contact · admin-seed first · rates **fully public** · dual taxonomy (controlled niches + free tags) · **no `verifiedOnly` filter** in this slice.
- Input/output contracts are written in TypeScript/Zod-style pseudocode; exact field names match the Prisma schema.
- Each spec ends with a **Human review** checklist — the reviewer ticks these before the task is approved for build.
- Acceptance criteria are written as observable outcomes (the basis for Step 9 manual testing).
