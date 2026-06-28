# TASK-06 — Search & Creator-Card UI

*Medium priority · Depends on: TASK-04 (primitives), TASK-05 (search API)*

## Objective
The demand-side workspace: a filterable search page with creator-card results and a full creator-card detail view ready to contact.

## Decisions made (best-practice)
- **Filters live in the URL query string** (shareable, back-button friendly, re-runnable) and drive the `search.creators` call.
- **Creator card opens in a Drawer** (mobile) / side panel (desktop) reusing the public-profile payload, keeping the user in search context rather than navigating away.
- **Infinite scroll** via cursor (`nextCursor`), with a visible "cargar más" fallback for reliability.
- **Debounced filter changes** (300ms) to avoid request storms; loading + empty + error states are first-class.

## Scope
**In:** `/search` page, filter sidebar, results grid, creator-card drawer, loading/empty/error states, "Contactar"/"Contactado" affordance (wires to TASK-07).
**Out:** saved searches/lists/favorites (backlog), the contact modal itself (TASK-07).

## Requirements
1. **`/search`** (orgProcedure-gated route; non-org users redirected): sidebar filters — nichos (controlled chips), país, ciudad, plataforma, rango de seguidores (min/max), engagement (min/max), tags (free input), texto libre (`q`), sort selector. State synced to URL.
2. **Results grid** of creator cards: avatar, username, headline, país, niche chips, reach (`maxFollowers` formatted via `Intl`), top-platform stat, Verificado badge when any account verified.
3. **Creator-card detail** (Drawer/panel): full public-profile payload + org actions — **Contactar** (opens TASK-07 modal) and **Contactado** state when already contacted (`contact.listSentByOrg`).
4. **States:** skeleton loading; empty ("Ajustá los filtros para ver más creadores"); error with retry; end-of-results.
5. **Mobile-first:** filters collapse into a bottom sheet / toggle on small screens.

## Acceptance criteria
- Changing any filter updates results and the URL; sharing the URL reproduces the search.
- Cards show correctly formatted reach and the Verificado badge only when applicable.
- Opening a card shows the full profile; "Contactar" is present for capable orgs and reflects "Contactado" if already contacted.
- Empty/loading/error/end states all render; layout works on mobile.

## Test plan
- Storybook: card, filter chip, drawer, empty state.
- E2E: apply filters → see results → open card → see Contactar; reload URL reproduces state.
- Manual: mobile filter sheet; large-result scroll/pagination; Spanish copy.

## Human review
- [ ] Approve URL-as-filter-state.
- [ ] Approve drawer-over-navigation for the card.
- [ ] Approve infinite scroll + "cargar más" fallback.
