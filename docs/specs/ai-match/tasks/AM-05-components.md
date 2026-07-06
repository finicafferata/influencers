# AM-05 — Extract `<CreatorCard>` + `<CreatorFilters>`

*Frontend · Depends on: none · Refactor (touches shipped search UI)*

## Objective
Turn the inline search card + filter sidebar into reusable components so `/match` (results + editable criteria) and `/search` share them. Behavior-preserving for search.

## Requirements
1. **`components/CreatorCard.tsx`**: props `{ item: CardItem; onClick?; footer? }`. Move the inline card JSX (`search/page.tsx` results `.map`). `footer` slot lets `/match` add rationale + score breakdown + thumbs under the card.
2. **`components/CreatorFilters.tsx`**: props `{ value: CreatorFilterState; onChange }`. Move the inline filter `<aside>` (niches chips, country/platform selects, followers/engagement inputs). Used by `/search` AND `/match`'s "modo guiado" + editable-criteria step.
3. **Refactor `/search`** to consume both — **no behavior change** (filters, URL sync, drawer, infinite scroll all still work).
4. Keep the drawer detail (with `ContactButton`) reusable too (optional `<CreatorDetail>` extraction) so `/match` reuses the contact path.

## Acceptance
- `/search` works identically (filters, sort, pagination, card→drawer→contact).
- `CreatorCard`/`CreatorFilters` render standalone (Storybook/manual) and are imported by both pages.

## Test plan
- Manual regression of `/search` end-to-end.
- Render each component in isolation.

## Human review
- [ ] Approve component API (props/slots).
- [ ] Confirm acceptable to refactor shipped search UI now (vs. later).
