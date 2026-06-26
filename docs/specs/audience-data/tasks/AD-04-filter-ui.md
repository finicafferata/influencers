# AD-04 — Audience-country control in CreatorFilters

*Frontend · Depends on: AD-03*

## Objective
One shared control that adds audience-country filtering to both search and match.

## Requirements
1. **`CreatorFilters`** (`components/CreatorFilters.tsx`): add `audienceCountry` to `CreatorFilterState` + a labeled **"Audiencia en…"** `<Select>` (reuse `COUNTRIES`) — distinct from the existing creator-country control.
2. **Search** (`search/page.tsx`): add `audienceCountry` state, include it in the `input` memo → `search.creators`.
3. **Match** (`match/page.tsx`): add `audienceCountry` to `EMPTY_FS`, `fsToCriteria`, and the local `Criteria` type → `match.run`.

## Acceptance
- The audience-country control appears once (shared) and flows to both search results and match.
- Selecting it narrows results to creators whose audience is that country; clearing it restores.

## Test plan
- Manual: search + match both honor the control; label clearly separates creator vs audience country.

## Human review
- [ ] Approve the "Audiencia en…" label/placement vs creator country.
