# TASK-08 — Admin Seed + Verification

*Low priority (but unblocks launch inventory) · Depends on: TASK-03*

## Objective
Give the platform owner the minimum tools to hand-seed creator inventory (decision 3) and grant the "Verificado" badge (decision 1, phase 1–2), plus light moderation.

## Decisions made (best-practice)
- **Admin verification is the phase-1 trust mechanism** — an admin reviews and flips `verified=true`/`source='admin'`. OAuth/provider verification stays backlog; schema fields already support it with zero migration.
- **Admin can create complete creator profiles** on behalf of seeded creators (the cold-start lever) — same validation as `creator.upsertProfile` but acting on a target user.
- **Minimal `/admin` screen**, gated by `adminProcedure`, not a full CMS. Just enough to seed, verify, and moderate.

## Scope
**In:** `admin.*` procedures + a basic `/admin` screen.
**Out:** analytics dashboards, bulk import, OAuth/provider verification (backlog).

## Requirements — procedures (all `adminProcedure`)
1. `admin.createCreatorProfile`: create a user (if needed) + complete creator profile (reuse TASK-03 validation), optionally `published:true`.
2. `admin.listUsers` (paginated, filter by role/suspended).
3. `admin.suspendUser` / `admin.unsuspendUser`: toggles `User.suspended` (search already excludes suspended).
4. `admin.verifySocialAccount`: set `verified:true`, `verificationSource:'admin'`, `verifiedAt:now`; `admin.unverifySocialAccount` reverses.
5. `admin.listContacts`: moderation view of all contacts.

## Requirements — UI
6. **`/admin`** (admin-only): tabs for Creators (seed + verify accounts), Users (list + suspend), Contacts (list). Functional, not polished.

## Acceptance criteria
- Admin can create a published creator that immediately appears in org search.
- Admin can grant a social account the Verificado badge; it shows on card + public profile.
- Admin can suspend a user; they disappear from search.
- Non-admins get `FORBIDDEN` on every `admin.*` call and cannot load `/admin`.

## Test plan
- Unit: `adminProcedure` gate; verify/unverify transitions; suspend reflected in search.
- Integration: seed-then-search appearance; suspend-then-absent.
- Manual: walk the `/admin` tabs.

## Human review
- [ ] Approve admin-as-phase-1 verification (manual badge).
- [ ] Approve admin creating profiles on behalf of creators for seeding.
- [ ] Confirm `/admin` scope is "functional, minimal" for the slice.
