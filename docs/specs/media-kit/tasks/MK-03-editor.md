# MK-03 — Profile editor: portfolio + rates toggle + pitch + analytics

*Frontend (`/dashboard/profile`) · Depends on: MK-02*

## Objective
Let creators build their kit: manage work samples, write a pitch, toggle rate visibility, and see their view count.

## Requirements
1. **Portfolio section** (clone the social-account block at `dashboard/profile/page.tsx:167–187`): add item (URL + type select + optional title), list current items with `lib/embed.ts` preview thumbnails, remove, reorder (up/down buttons v1). Wires to `addPortfolioItem`/`removePortfolioItem`/`reorderPortfolio`.
2. **Pitch field** (textarea, ≤280) + **rates visibility toggle** (`ratesPublic`) added to the editor's local state and `save()` (which calls `upsertProfile`).
3. **Analytics line**: "Tu media kit fue visto {viewCount} veces" from `me.data.viewCount` (getMine).
4. Spanish copy via `es` dictionary; reuse `Field`/`Input`/`Select`/`Button`/`Chip` primitives.

## Acceptance
- Creator adds/removes/reorders work samples; previews render per type.
- Toggling rates off → public kit shows "Tarifas a consultar" and the payload omits rates.
- Pitch saves and appears on the kit hero.
- View count displays.

## Test plan
- Storybook/manual: portfolio item rows, toggle, empty state.
- E2E: add 2 items → reorder → see new order on `/c/<username>`.

## Human review
- [ ] Approve up/down reorder for v1 (vs drag-and-drop).
- [ ] Approve toggle default = rates visible.
