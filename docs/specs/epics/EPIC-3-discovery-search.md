# EPIC-3 — Creator Discovery & Search

*Status: Draft · Wraps TASK-05, TASK-06 · Depends on: EPIC-1, EPIC-2*

## Goal
An org can filter, find, and evaluate published creators — the demand-side payoff and the most defining feature of the product.

## Definition of Done (Gate B)
An org applies filters, gets paginated published-only results sorted correctly, opens a full creator card, and is ready to contact — with clean empty/loading/error states, on mobile.

---

### Backend

### ISS-3.1 — `search.creators` where-builder + procedure · `L`
orgProcedure (`can_search_creators`); compose Prisma where omitting undefined; niches/tags `hasSome`; reach via `socialAccounts.some`; always `published:true`, exclude suspended. **No `verifiedOnly`.**
**Acceptance:** any filter subset returns only matching published creators; impossible filters → empty payload.
**Deps:** EPIC-1, EPIC-2. **Review:** where-builder unit-tested per filter.

### ISS-3.2 — Sort + cursor pagination · `M`
Sorts: followers (`maxFollowers`), engagement (representative-account rule), recent. Cursor keyed to sort field + id; limit 20/max 50.
**Acceptance:** stable pagination (no dupes/skips) under each sort.
**Deps:** ISS-3.1. **Review:** engagement representative-account rule approved.

### ISS-3.3 — Free-text `q` (trigram) + index verification · `M`
`q` over headline + username via `pg_trgm`; confirm GIN/btree indexes from ISS-1.7 are used.
**Acceptance:** partial-text query returns expected matches; query plan uses indexes.
**Deps:** ISS-3.1, ISS-1.7. **Review:** trigram index migration present.

### Frontend

### ISS-3.4 — `/search` page + filter sidebar (URL state) · `L`
Filters: nichos chips, país, ciudad, plataforma, rango seguidores, engagement, tags, `q`, sort. State synced to URL; debounced.
**Acceptance:** filter changes update results + URL; sharing URL reproduces search; non-org redirected.
**Deps:** ISS-3.1/3.2/3.3, ISS-2.6. **Review:** URL-as-state + gating confirmed.

### ISS-3.5 — Results grid + creator card · `M`
Card: avatar, username, headline, país, niche chips, reach (Intl-formatted), top-platform stat, Verificado badge.
**Acceptance:** cards render correct data + badge only when verified.
**Deps:** ISS-3.4. **Review:** card composed from `packages/ui`.

### ISS-3.6 — Creator-card drawer + Contactar/Contactado · `M`
Drawer/panel reuses public-profile payload; org actions Contactar (opens EPIC-4 modal) + Contactado state.
**Acceptance:** card opens in context; Contactar present for capable orgs; Contactado when already sent.
**Deps:** ISS-3.5. **Review:** drawer-over-navigation confirmed.

### ISS-3.7 — Search states · `S`
Skeleton loading, empty ("ajustá los filtros"), error+retry, end-of-results.
**Acceptance:** all four states render; mobile filter sheet works.
**Deps:** ISS-3.4. **Review:** states + mobile layout.

---

## Human review checklist (Gate A)
- [ ] Approve dropping `verifiedOnly` for the slice.
- [ ] Approve engagement-sort representative-account rule.
- [ ] Approve `q` scope (headline+username trigram).
- [ ] Approve URL-as-filter-state and drawer card pattern.
