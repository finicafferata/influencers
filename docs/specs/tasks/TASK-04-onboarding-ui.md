# TASK-04 — Onboarding & Profile UI + UI Primitives

*High priority · Depends on: TASK-03 · Spanish-first, mobile-first*

## Objective
Build the supply/demand entry screens and the shared UI primitives they need: role selection, creator onboarding wizard, profile editor, public profile page, and org onboarding. Replace the Next.js template landing.

## Decisions made (best-practice)
- **Spanish-first via a string dictionary** (`messages/es.json`) wired through a light i18n setup (`next-intl`), default locale `es`, structured so English is additive later. Only `es` ships.
- **`packages/ui` is the single component source**, each primitive documented in Storybook; screens compose primitives (no bespoke one-off styling).
- **Creator onboarding autosaves drafts** per step via `creator.upsertProfile`; publish is an explicit final action. *(Reduces drop-off — the supply side is the scarce resource.)*
- **Public profile is SSR** (`/c/[username]`) for shareability + SEO; org-only actions hydrate client-side from `me.bootstrap`.
- **Stub `/dashboard`** ships here (auth flows already redirect to it) — minimal landing that routes by role.

## Scope
**In:** `/onboarding/role`, `/onboarding/creator` (4 steps), `/dashboard/profile`, `/c/[username]`, `/onboarding/org`, `/dashboard` stub, new landing page, UI primitives + Storybook, `es` dictionary.
**Out:** search UI (TASK-06), contact/inbox/bell (TASK-07), admin (TASK-08).

## UI primitives to add to `packages/ui` (with stories)
`Button`, `Input`, `Textarea`, `Select`, `Chip`/`ChipGroup` (niche/tag selection), `Card`, `Avatar`, `Badge` (incl. "Verificado"), `Modal`/`Drawer`, `Stepper`, `MetricStat`, `FollowerBadge`, `EmptyState`, `Toast`.

## Screen requirements
1. **`/onboarding/role`** — two cards ("Soy creador" / "Soy marca o agencia"). Routes to creator/org onboarding. Reads `me.bootstrap`; if role already set, redirect to `/dashboard`.
2. **`/onboarding/creator`** (Stepper, 4 steps): (1) básicos: username (uniqueness check, immutability note), país, ciudad; (2) redes + métricas: add/edit social accounts; (3) nichos (controlled chips from taxonomy) + tipo de contenido + tags (free chips); (4) headline, bio, rates, portfolio. Autosave per step; final → `creator.publish` → redirect to `/c/[username]`.
3. **`/dashboard/profile`** — same form in edit mode; publish/unpublish toggle; "ver perfil público" link.
4. **`/c/[username]`** (SSR) — header (avatar, username, headline, país, Verificado badge per account), métricas per platform, niches + tags, **rates (public to everyone)**, portfolio, collaborations. Org viewer with `can_search_creators` sees **"Contactar"** (wires in TASK-07); others don't.
5. **`/onboarding/org`** — name, displayType selector (**only `brand` and `marketing_agency` in this slice** — both `can_search_creators`; `talent_agency`/`hybrid` hidden until the roster epic, REVIEW-01, so no one onboards into an unservable role), capability preview, país, logo/website. → `org.create` → `/dashboard`.
6. **`/dashboard`** (stub) — routes/links by role (creator: my profile/contacts; org: search/lists later).
7. **Landing** — replace template with dual-CTA hero (creator / marca-agencia), Spanish copy.

## Acceptance criteria
- New user picks role → completes onboarding → lands on their published public profile (creator) or dashboard (org).
- Public profile renders server-side, shows rates to logged-out visitors, and shows "Contactar" only to capable org viewers.
- All copy is Spanish; layouts verified on mobile width.
- Every screen composes `packages/ui` primitives that each have a Storybook story.

## Test plan
- Storybook visual check per primitive.
- E2E: role → creator onboarding → publish → public profile; role → org onboarding → dashboard.
- Manual: mobile layout on all 5 screens; Spanish copy review; logged-out vs org view of `/c/[username]`.

## Human review
- [ ] Approve `next-intl` + `es.json` approach.
- [ ] Approve 4-step order and autosave-draft behavior.
- [ ] Approve public profile SSR + rates visible to logged-out users (confirms Q4 at the UI level).
- [ ] Approve landing copy/CTA direction.
