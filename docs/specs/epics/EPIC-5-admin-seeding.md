# EPIC-5 — Admin & Inventory Seeding

*Status: Draft · Wraps TASK-08 · Depends on: EPIC-2 · Runnable in parallel after EPIC-2*

## Goal
Give the platform owner the minimum to hand-seed creator inventory (cold-start) and grant the Verificado badge (phase-1 verification), plus light moderation.

## Definition of Done (Gate B)
Admin creates a published creator that appears in org search, grants a Verificado badge that shows on card + profile, and suspends a user who then disappears from search. Non-admins are fully blocked.

---

### ISS-5.1 — Admin procedures · `M`
adminProcedure: `createCreatorProfile` (reuse TASK-03 validation, optional publish), `listUsers`, `suspendUser`/`unsuspendUser`, `listContacts`.
**Acceptance:** admin seeds a published creator; suspend removes from search; non-admin → FORBIDDEN.
**Deps:** EPIC-2. **Review:** adminProcedure gate on every call.

### ISS-5.2 — `admin.verifySocialAccount` · `S`
Set `verified:true`, `verificationSource:'admin'`, `verifiedAt:now`; unverify reverses.
**Acceptance:** badge appears on card + public profile after verify.
**Deps:** ISS-5.1. **Review:** source/timestamp set.

### ISS-5.3 — `/admin` screen · `M`
Admin-only; tabs: Creators (seed + verify), Users (list + suspend), Contacts (list). Functional, minimal.
**Acceptance:** all three tabs operate; non-admin can't load.
**Deps:** ISS-5.1, ISS-5.2. **Review:** scope stays minimal.

---

## Human review checklist (Gate A)
- [ ] Approve admin-as-phase-1 verification (manual badge).
- [ ] Approve admin creating profiles on behalf of creators.
- [ ] Confirm `/admin` is "functional, minimal" for the slice.
