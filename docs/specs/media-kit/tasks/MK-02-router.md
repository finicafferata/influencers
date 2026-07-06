# MK-02 — Portfolio CRUD + payload strip + recordView

*Backend (creator router) · Depends on: MK-01*

## Objective
Portfolio management, the privacy-correct public payload, and the owner-excluded view counter.

## Decisions
- Rates **stripped server-side** in `getByUsername` when `ratesPublic=false` (not just hidden in UI).
- `viewCount` never on the public payload.
- Owner-excluded view increment; dedupe is best-effort client-side (MK-06).

## Requirements
1. **Portfolio CRUD** (creatorProcedure; mirror the social-account CRUD pattern at `creator.ts:75/91/106`):
   - `addPortfolioItem({ url, type ∈ PORTFOLIO_TYPES, title?, thumbnailUrl? })` → append with next `order`.
   - `removePortfolioItem({ id })` → ownership-checked (`item.creatorId === ctx.creatorId` else NOT_FOUND).
   - `reorderPortfolio({ ids: string[] })` → rewrite `order` by index; validate all ids belong to caller.
2. **`upsertProfile`**: extend `profileFieldsSchema` with `pitch?` (≤280) and `ratesPublic?` (boolean).
3. **`getByUsername` (public)**: explicit portfolio `select { id, url, type, title, thumbnailUrl, order }`. In the **return path only**, if `!profile.ratesPublic` delete `profile.rates` (set to null); always delete `viewCount` before returning. (Do NOT change the shared `PUBLIC_PROFILE_INCLUDE` — `getMine` needs both.)
4. **`recordView({ username })` (publicProcedure mutation)**: load `{ id, userId, published }`; if not published → no-op ok; if `ctx.userId === userId` → skip (owner); else `update({ data: { viewCount: { increment: 1 } } })`. Return `{ ok: true }`.
5. **`getMine`** already returns `viewCount` once the column exists — no change.

## Contracts
```ts
addPortfolioItem(input:{url:string; type:'image'|'video'|'link'; title?:string; thumbnailUrl?:string}): PortfolioItem
reorderPortfolio(input:{ ids: string[] }): { ok: true }
getByUsername({username}): PublicProfile  // rates omitted when private; never viewCount
recordView({username}): { ok: true }
```

## Acceptance
- Add/remove/reorder portfolio works and is ownership-scoped.
- A private-rates profile returns NO `rates` over the wire; the owner's `getMine` still has rates.
- Non-owner view increments `viewCount`; owner view does not; `viewCount` absent from public payload.

## Test plan
- Unit: ownership guards; rates-strip branch; owner-exclusion in `recordView`; reorder index rewrite.
- Integration: full portfolio lifecycle; public vs owner payload diff.

## Human review
- [ ] Confirm rates stripped to `null` (vs key omitted) — pick one shape.
- [ ] Confirm `pitch` max length.
- [ ] Confirm `recordView` is fire-and-forget (no auth, rate-limit acceptable?).
