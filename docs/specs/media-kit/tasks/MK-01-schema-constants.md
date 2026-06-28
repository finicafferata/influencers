# MK-01 — Schema deltas + constants + embed helper

*Backend/shared · Depends on: none*

## Objective
Add the additive data + shared helpers the media kit needs. No new tables.

## Scope
**In:** `CreatorProfile.pitch/ratesPublic/viewCount`; `PortfolioItem.title/thumbnailUrl`; `PORTFOLIO_TYPES` constant; `lib/embed.ts`.
**Out:** any procedure/UI (MK-02+).

## Requirements
1. **Schema** (`packages/db/prisma/schema.prisma`):
   - `CreatorProfile`: `pitch String?`, `ratesPublic Boolean @default(true)`, `viewCount Int @default(0)`.
   - `PortfolioItem`: `title String?`, `thumbnailUrl String?`.
2. **Migration**: additive; defaults backfill existing rows (`ratesPublic=true`, `viewCount=0`).
3. **Constant** (`packages/trpc/src/constants.ts`): `PORTFOLIO_TYPES = ['image','video','link'] as const` + `PORTFOLIO_TYPE_SET` (mirror `CONTENT_TYPES`).
4. **`apps/web/src/lib/embed.ts`**: `getEmbed(url): { kind: 'image'|'youtube'|'tiktok'|'instagram'|'link'; embedUrl?; thumbnailUrl? }`. Pure, no network. YouTube → watch/shorts/youtu.be id → thumbnail + embed iframe URL; image extensions → image; TikTok/IG → link card (no oEmbed v1); else → link.

## Acceptance
- `prisma migrate` applies on clean + seeded DB; client regenerates; seed profiles load (`ratesPublic=true`).
- `getEmbed` returns the right `kind` for YouTube/image/TikTok/IG/plain URLs (unit-tested).
- No recompute/include conflict (extension is `socialAccount`-scoped only).

## Human review
- [ ] Approve `pitch` vs reusing `headline` (kit uses both: headline = role one-liner, pitch = longer intro).
- [ ] Approve `PORTFOLIO_TYPES` set.
- [ ] Approve v1 embed scope (images inline; video/social as cards; naive YouTube iframe).
