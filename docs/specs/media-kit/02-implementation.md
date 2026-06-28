# Profile-as-Media-Kit — Step 2: Detailed Implementation Plan

*Phase 1 · Date: 2026-06-07 · Status: Draft for human review*

## 0. Decisions locked (from Step 1 review)

| # | Question | Decision |
|---|----------|----------|
| Q1 | OG preview image | **Dynamic** — generated per profile (Next `ImageResponse`) |
| Q2 | Rates on the broadcast kit | **Public as "desde X"** + per-creator **hide toggle** (`ratesPublic`, default true); hidden → "Tarifas a consultar" |
| Q3 | Portfolio media | **URL embeds only** (image URL / video link / link) — no upload, no storage |
| Q4 | View analytics | **Simple counter** |
| Q5 | Which views count | **Anon + authed, exclude owner, dedupe per session** |

## 1. Phase scope

**In this phase:** E1 kit layout · E2 portfolio (URL) · E3 dynamic OG previews · E4 one-tap share + QR · I1 view counter · the Q2 rates toggle.
**Fast-follow (next phase):** I2 completeness meter · I3 PDF export · I4 section customization · I5 root-level vanity link.
**Backlog:** D1–D5 (themes, multi-kit, embed widget, auto-pull, lead capture).

This is **presentation + shareability + two small data gaps** — no heavy infra. Builds entirely on the existing `/c/[username]` SSR profile and `CreatorProfile`/`PortfolioItem` schema.

## 2. Schema deltas (additive)

1. **`CreatorProfile.pitch String?`** — short intro/tagline shown atop the kit.
2. **`CreatorProfile.ratesPublic Boolean @default(true)`** — Q2 toggle.
3. **`CreatorProfile.viewCount Int @default(0)`** — Q4 denormalized counter.
4. **`PortfolioItem`** (exists: `id, creatorId, url, type, order`) — add **`title String?`** and **`thumbnailUrl String?`** for link/video cards. `type` constrained in code to `image | video | link`.
5. No new tables (Q4 = counter, not a view-log). Owner-exclusion + dedupe handled at the write path (§4.3), not via stored events.

## 3. Constants / helpers

1. `PORTFOLIO_TYPES = ['image','video','link'] as const` in the shared constants.
2. A small `lib/embed.ts` (web): given a URL, detect YouTube/TikTok/Instagram and return an embed/thumbnail strategy; images render `<img>`, videos render a thumbnail card linking out (naive YouTube iframe allowed), links render a titled card.

## 4. tRPC procedures

### 4.1 Portfolio (creator router)
1. `creator.addPortfolioItem` (creatorProcedure): `{ url, type ∈ PORTFOLIO_TYPES, title?, thumbnailUrl? }` → appends with next `order`.
2. `creator.removePortfolioItem` (creatorProcedure): `{ id }` (ownership-checked).
3. `creator.reorderPortfolio` (creatorProcedure): `{ ids: string[] }` → rewrites `order`.
4. Extend `upsertProfile` input with `pitch?` and `ratesPublic?`.

### 4.2 Public payload
5. `creator.getByUsername` already includes `portfolio` ordered by `order` — extend the select with `title`, `thumbnailUrl`, `type`, `url`. Respect `ratesPublic`: when false, **omit `rates` from the public payload** (don't just hide client-side — strip server-side so it can't be scraped).

### 4.3 View counter (Q4/Q5)
6. `creator.recordView` (publicProcedure mutation): `{ username }` → increments `viewCount` **unless** `ctx.userId === profile.userId` (owner-exclusion). Dedupe is best-effort client-side (§5.4) via a per-session flag; server only enforces owner-exclusion and that the profile is published.
7. `viewCount` is returned in `creator.getMine` for the creator's dashboard ("visto N veces"); it is **not** shown on the public kit.

## 5. Web implementation

### 5.1 Media-kit layout (E1) — redesign `/c/[username]`
1. Hero: avatar, name, `@username`, pitch/headline, country, Verificado badge, **share button**.
2. Stat band: per-platform reach + engagement, prominent (`formatFollowers`/`formatEngagement`).
3. Work gallery (E2): portfolio items via `lib/embed.ts`.
4. Brands: existing collaborations as logos/chips.
5. Rates: "desde {money}" per deliverable when `ratesPublic`, else "Tarifas a consultar".
6. CTA: "Contactar" (existing `ContactButton`, org-gated) + share.
7. Mobile-first; this is the most-shared screen — polish matters.

### 5.2 Portfolio editor (E2) — in `/dashboard/profile`
8. Section to add (URL + type + optional title), list, remove, drag/reorder (or up/down for v1). Wires to §4.1.
9. Add the **rates visibility toggle** and **pitch** field to the editor (§4.1.4).

### 5.3 Dynamic OG previews (E3, Q1)
10. `generateMetadata` in `/c/[username]/page.tsx`: title `@username — headline`, description from pitch/niches, `openGraph` + `twitter` card pointing at the dynamic image.
11. **`app/c/[username]/opengraph-image.tsx`** using Next `ImageResponse` (edge): render a branded card with avatar, name, top stat, niches. Fetches the profile via the public `getByUsername` (published-only).
12. Verify unfurling on WhatsApp/IG/Twitter/iMessage (manual, Step 9).

### 5.4 Share (E4)
13. Reusable `<ShareKit username>` component: copy-link, `navigator.share()` (mobile native sheet) with graceful fallback, and a **QR code** (inline SVG via a tiny QR lib — no external image service).
14. Surface it (a) on the public kit hero and (b) as a prominent "Compartí tu media kit" card on the creator dashboard / profile editor with the full URL.
15. On the public kit, fire `creator.recordView` once per session (sessionStorage flag) — the dedupe for Q5.

### 5.5 Analytics display (I1)
16. Dashboard/profile shows `viewCount` ("Tu media kit fue visto N veces").

## 6. Build order

| # | Block | Depends on |
|---|-------|-----------|
| 1 | §2 schema deltas + migration; §3 constants | — |
| 2 | §4.1–4.2 portfolio + payload + upsert fields | 1 |
| 3 | §4.3 view counter | 1 |
| 4 | §5.2 portfolio editor + rates toggle + pitch | 2 |
| 5 | §5.1 kit layout redesign | 2 |
| 6 | §5.3 dynamic OG (metadata + image route) | 5 |
| 7 | §5.4 share component + view ping | 5 |
| 8 | §5.5 analytics display | 3 |

When 1→7 are green, a creator can build a rich kit, share a link that unfurls beautifully, and see it get viewed — the share loop has a heartbeat.

## 7. Risks / call-outs for review
1. **Dynamic OG image data fetch:** the `opengraph-image` route must fetch profile data at the edge; confirm `getServerTrpc`/a direct fetch works in that runtime, and cache aggressively (OG images are hit by crawlers, not users).
2. **Embeds without oEmbed:** v1 renders images inline and videos/links as cards (+ naive YouTube iframe). Full oEmbed/rich TikTok-IG embeds are deferred — confirm that's acceptable for the kit's credibility.
3. **View-count dedupe is best-effort** (client session flag + server owner-exclusion). Good enough for a counter; if we later want trustworthy analytics, promote to a `ProfileView` table (deferred).
4. **Rates stripped server-side when private** — confirm we want the public payload to omit rates entirely (not just hide them in the UI).
5. **QR library** adds a small client dep — confirm vs. a server-generated SVG.

> Next: **Step 3 — checklist** for the media-kit feature, then code review against current `/c/[username]` + profile editor.
