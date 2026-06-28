# EPIC-2 — Creator & Org Onboarding

*Status: Draft · Wraps TASK-03, TASK-04 · Depends on: EPIC-1*

## Goal
A creator can build and publish a profile; an org can sign up with the right capabilities. Supply and demand identities exist.

## Definition of Done (Gate B)
A new user picks a role, completes onboarding, and (creator) lands on a published public profile or (org) on the dashboard — all Spanish-first, mobile-verified, composed from `packages/ui` primitives.

---

### Backend

### ISS-2.1 — `creator.upsertProfile` + `getMine` · `M`
Create/edit profile; username immutable once set; validate niches⊆taxonomy, tags normalized, rates Json.
**Acceptance:** create then edit works; username can't change; invalid niche rejected.
**Deps:** EPIC-1. **Review:** username immutability + validation match TASK-03.

### ISS-2.2 — Social account CRUD + `maxFollowers` recompute · `M`
Add/update/remove with platform uniqueness; recompute `maxFollowers`; set `self_reported`.
**Acceptance:** `maxFollowers` always = max account followers; duplicate platform blocked.
**Deps:** ISS-2.1. **Review:** single sync path for `maxFollowers`.

### ISS-2.3 — `publish` / `unpublish` + completeness gate · `S`
Block publish unless username ∧ ≥1 social ∧ ≥1 niche ∧ contentType.
**Acceptance:** incomplete publish returns the missing-fields list; complete sets `published:true`.
**Deps:** ISS-2.1, ISS-2.2. **Review:** gate fields correct.

### ISS-2.4 — `creator.getByUsername` (public) · `S`
Public payload only if published or owner.
**Acceptance:** published → payload; draft → NOT_FOUND for non-owner.
**Deps:** ISS-2.1. **Review:** owner-bypass correct.

### ISS-2.5 — `org.create` + `getMine` · `M`
Derive capabilities from displayType; create owner membership; allow multiple orgs.
**Acceptance:** each displayType yields correct capabilities + owner membership.
**Deps:** EPIC-1. **Review:** capability defaults match TASK-03.

### Frontend

### ISS-2.6 — UI primitives in `packages/ui` + Storybook · `L`
Button, Input, Textarea, Select, Chip/ChipGroup, Card, Avatar, Badge (Verificado), Modal/Drawer, Stepper, MetricStat, FollowerBadge, EmptyState, Toast.
**Acceptance:** each has a Storybook story; screens import only from `packages/ui`.
**Deps:** none (parallel). **Review:** no one-off styling in screens.

### ISS-2.7 — i18n setup (`es` default) · `S`
`next-intl` + `messages/es.json`; only `es` ships, structured for later English.
**Acceptance:** strings resolved via dictionary; locale default `es`.
**Deps:** none. **Review:** no hardcoded copy in components.

### ISS-2.8 — `/onboarding/role` · `S`
Two role cards; route by selection; redirect if role already set.
**Acceptance:** new user routes correctly; existing user redirected to `/dashboard`.
**Deps:** ISS-1.4, ISS-2.6/2.7. **Review:** uses `me.bootstrap`.

### ISS-2.9 — `/onboarding/creator` 4-step wizard · `L`
Steps: básicos · redes+métricas · nichos+tipo+tags · headline/bio/rates/portfolio. Autosave per step; final publishes.
**Acceptance:** drafts persist between steps; final lands on public profile.
**Deps:** ISS-2.1/2.2/2.3, ISS-2.6/2.7. **Review:** autosave + publish flow.

### ISS-2.10 — `/dashboard/profile` editor · `M`
Edit mode + publish/unpublish toggle + "ver perfil público".
**Acceptance:** edits save; toggle reflects `published`.
**Deps:** ISS-2.9. **Review:** reuses wizard form.

### ISS-2.11 — `/c/[username]` public profile (SSR) · `M`
Header + Verificado badge, métricas, niches/tags, **rates public to all**, portfolio, collaborations; org viewers see "Contactar" (wires later).
**Acceptance:** SSR renders; logged-out sees rates; capable org sees Contactar.
**Deps:** ISS-2.4, ISS-2.6. **Review:** SSR + rates-public confirmed.

### ISS-2.12 — `/onboarding/org` · `M`
Name, displayType + capability preview, país, logo/website → `org.create`.
**Acceptance:** org created with correct capabilities; lands on dashboard.
**Deps:** ISS-2.5, ISS-2.6/2.7. **Review:** capability preview matches backend.

### ISS-2.13 — `/dashboard` stub + landing replacement · `S`
Role-routing dashboard stub; replace Next.js template landing with dual-CTA Spanish hero.
**Acceptance:** auth redirects resolve; landing shows creator/marca CTAs.
**Deps:** ISS-1.4, ISS-2.6/2.7. **Review:** template fully removed.

### ISS-2.14 — i18n setup (first-class) · `S` · *REVIEW-01 missing-scope*
Promote i18n to its own issue; `next-intl` + `messages/es.json`; **must land before any Block-4 screen** so copy isn't retrofitted.
**Acceptance:** all onboarding/profile copy resolves from the dictionary; default locale `es`.
**Deps:** none. **Review:** no hardcoded strings in screens. *(Supersedes the inline note in ISS-2.7.)*

### ISS-2.15 — Avatar / image handling · `S` · *REVIEW-01 missing-scope*
MVP: **image URL input** on the profile (Google avatar auto-filled when present); direct upload deferred to fast-follow.
**Acceptance:** creator can set an avatar/profile image via URL; cards + profile render it; sensible placeholder when absent.
**Deps:** ISS-2.1, ISS-2.6. **Review:** confirm URL-now vs upload-now decision.

---

## Human review checklist (Gate A)
- [ ] Approve username immutability + rates Json shape.
- [ ] Approve capability defaults per displayType.
- [ ] Approve `next-intl` + `es.json`.
- [ ] Approve onboarding step order + autosave.
- [ ] Approve landing CTA direction.
