# CreatorLink — Slice 1 Epics & Issues (Step 6)

*Step 6 of the product workflow · Date: 2026-06-07 · Status: Draft for human review*

This folder turns the Step 5 task specs into **epics and implementable issues**. Only work that fits **Slice 1** (the minimum two-sided loop) lives here. Everything else is pulled out into [`BACKLOG.md`](BACKLOG.md) so it exists but does not pollute the slice.

## Epics (in-slice)

| Epic | Title | Wraps tasks | Value milestone |
|------|-------|-------------|-----------------|
| [EPIC-1](EPIC-1-auth-schema-foundation.md) | Auth & Schema Foundation | T1, T2 | The API can authenticate and the data model is ready |
| [EPIC-2](EPIC-2-creator-org-onboarding.md) | Creator & Org Onboarding | T3, T4 | A creator can publish a profile; an org can sign up |
| [EPIC-3](EPIC-3-discovery-search.md) | Creator Discovery & Search | T5, T6 | An org can find and evaluate creators |
| [EPIC-4](EPIC-4-contact-notifications.md) | Contact & Notifications | T7 | The loop closes — orgs reach creators, creators respond |
| [EPIC-5](EPIC-5-admin-seeding.md) | Admin & Inventory Seeding | T8 | We can hand-seed inventory and grant verification |

**Build order:** EPIC-1 → EPIC-2 → EPIC-3 → EPIC-4, with EPIC-5 runnable in parallel after EPIC-2. The loop has a heartbeat when EPIC-1→4 are green.

## Estimates (rough, for sequencing only)

`S` ≈ <½ day · `M` ≈ ½–1 day · `L` ≈ 1–2 days. These are relative sizes, not commitments.

## What was discarded or deferred (and why)

Pulled **out** of the slice into the backlog so the epics stay lean:
- Saved searches, saved lists/favorites UI, talent-agency roster view → retention features, not loop-critical.
- `verifiedOnly` search filter → no verified inventory yet (decision 5).
- Email notifications → in-app is the decision for this slice.
- OAuth/provider verification, messaging, reviews, payments, contracts, analytics, mobile app, AI matching → Desired tier (post-MVP).

Nothing was kept "just in case." If it isn't needed to make a creator discoverable and contactable, it's in the backlog.

---

## Human review plan

Two review gates per epic, plus a per-issue checkpoint. **No issue starts until its spec checkboxes (Step 5) are approved; no issue closes until its acceptance criteria are demonstrated.**

### Gate A — Spec approval (before code)
Reviewer (product + tech lead) signs off the epic's issues and the relevant TASK-* "Human review" checklist. Confirms scope, contracts, and the decisions I made on your behalf. Output: epic moved from `Draft` → `Approved for build`.

### Per-issue checkpoint (during build)
Each issue carries a **Review** line listing what the PR reviewer must confirm (tests present, contract matches spec, decision honored). Every PR references its issue ID and links the spec.

### Gate B — Acceptance demo (before epic close)
The epic's value milestone is demonstrated end-to-end (the basis for Step 9 manual testing). Reviewer ticks the epic's **Definition of Done**. Output: epic `Done`.

### Roles
- **Product** — owns scope/decision sign-off (Gate A) and acceptance (Gate B).
- **Tech lead** — owns contract/architecture sign-off (Gate A) and PR review (per-issue).
- **Implementer** — owns issue delivery + tests.

### Status legend
`Draft` → `Approved for build` → `In progress` → `In review` → `Done`. All issues start `Draft`.

---

## Issue ID scheme
`ISS-<epic>.<n>` (e.g. `ISS-1.2`). Stable across any future export to GitHub/Linear/Jira.

## REVIEW-01 amendments
An independent review ([`../REVIEW-01-independent-review.md`](../REVIEW-01-independent-review.md)) added issues and reversed the auth decision. New issues: **ISS-1.10** (Next.js tRPC proxy — replaces the API-origin-cookie approach), **ISS-1.11** (logout), **ISS-1.12** (reject suspended in context), **ISS-1.13** (capability constant), **ISS-2.14** (i18n first-class), **ISS-2.15** (avatar handling). Backend hardening (maxEngagement denorm, DB-level contact dedupe, pg_trgm, per-route throttles) folded into existing issues. Total in-slice issues: **44**.
