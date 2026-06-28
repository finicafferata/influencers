# Profile-as-Media-Kit — Step 3: Implementation Checklist

*Phase 1 · Date: 2026-06-07 · Status: Draft for human review*

Every item back-references a Step 2 point `[§x]` (`02-implementation.md`). This is the product-level definition of done — not a code diff. Each block ends with a demoable **Acceptance**.

**Decisions applied:** dynamic OG image · rates public-as-"desde" + hide toggle (stripped server-side when private) · URL embeds only · deduped, owner-excluded view counter.

---

## Block 1 — Schema + constants `[§2, §3]`

- [ ] `CreatorProfile.pitch String?` `[§2.1]`
- [ ] `CreatorProfile.ratesPublic Boolean @default(true)` `[§2.2]`
- [ ] `CreatorProfile.viewCount Int @default(0)` `[§2.3]`
- [ ] `PortfolioItem.title String?` + `thumbnailUrl String?` `[§2.4]`
- [ ] `PORTFOLIO_TYPES = ['image','video','link']` shared constant `[§3.1]`
- [ ] `lib/embed.ts` URL→render-strategy helper (YouTube/TikTok/IG/image/link) `[§3.2]`

**Acceptance:** migration applies cleanly; client regenerates; existing seed profiles still load (defaults backfilled, `ratesPublic=true`).

---

## Block 2 — Portfolio + payload + profile fields `[§4.1, §4.2]`

- [ ] `creator.addPortfolioItem` (url, type∈PORTFOLIO_TYPES, title?, thumbnailUrl?) appends with next `order` `[§4.1.1]`
- [ ] `creator.removePortfolioItem` (ownership-checked) `[§4.1.2]`
- [ ] `creator.reorderPortfolio` rewrites `order` `[§4.1.3]`
- [ ] `upsertProfile` accepts `pitch?` and `ratesPublic?` `[§4.1.4]`
- [ ] `getByUsername` payload includes portfolio `{url,type,title,thumbnailUrl}` ordered by `order` `[§4.2.5]`
- [ ] **When `ratesPublic === false`, `rates` is omitted from the public payload server-side** `[§4.2.5]`

**Acceptance:** a creator can add/remove/reorder work samples via the API; a private-rates profile returns no `rates` field over the wire.

---

## Block 3 — View counter `[§4.3]`

- [ ] `creator.recordView({ username })` increments `viewCount`, **skips when caller is the owner**, requires published `[§4.3.6]`
- [ ] `creator.getMine` returns `viewCount` `[§4.3.7]`
- [ ] `viewCount` is NOT exposed on the public payload `[§4.3.7]`

**Acceptance:** a non-owner view increments the counter; the owner viewing their own kit does not.

---

## Block 4 — Portfolio editor + toggles `[§5.2]`

- [ ] `/dashboard/profile` section: add (URL + type + title), list, remove, reorder (up/down ok for v1) `[§5.2.8]`
- [ ] Rates visibility toggle + `pitch` field in the editor `[§5.2.9]`
- [ ] Portfolio renders via `lib/embed.ts` previews `[§3.2]`

**Acceptance:** creator builds a work gallery and toggles rate visibility from the dashboard.

---

## Block 5 — Media-kit layout `[§5.1]`

- [ ] Hero: avatar, name, @username, pitch/headline, país, Verificado badge, share button `[§5.1.1]`
- [ ] Prominent stat band (reach + engagement per platform) `[§5.1.2]`
- [ ] Work gallery `[§5.1.3]`; brand chips `[§5.1.4]`
- [ ] Rates "desde {money}" when public, "Tarifas a consultar" when hidden `[§5.1.5]`
- [ ] "Contactar" (org-gated) + share CTA `[§5.1.6]`; mobile-first `[§5.1.7]`

**Acceptance:** `/c/<username>` reads as a credible, scannable media kit on mobile and desktop.

---

## Block 6 — Dynamic OG previews `[§5.3]`

- [ ] `generateMetadata` sets per-profile title/description + openGraph + twitter `[§5.3.10]`
- [ ] `app/c/[username]/opengraph-image.tsx` renders a branded card (avatar, name, top stat, niches) via `ImageResponse`, published-only `[§5.3.11]`
- [ ] OG response cached for crawlers `[§7.1]`

**Acceptance:** pasting `/c/mariag` into WhatsApp/IG/Twitter unfurls a rich preview card.

---

## Block 7 — Share + view ping `[§5.4]`

- [ ] `<ShareKit>` : copy-link, `navigator.share()` w/ fallback, inline QR (SVG, no external service) `[§5.4.13]`
- [ ] Surfaced on the kit hero AND a "Compartí tu media kit" card on dashboard/editor `[§5.4.14]`
- [ ] `recordView` fired once per session (sessionStorage flag) on the public kit `[§5.4.15]`

**Acceptance:** creator copies/shares the link or QR; visiting the kit increments the counter once per session.

---

## Block 8 — Analytics display `[§5.5]`

- [ ] Dashboard/profile shows "Tu media kit fue visto N veces" `[§5.5.16]`

**Acceptance:** the creator sees a credible (owner-excluded) view count.

---

## Verification & testing (Step 9 targets)

- [ ] **Unit:** `lib/embed.ts` strategy per URL type; `recordView` owner-exclusion; rates-stripping when `ratesPublic=false`.
- [ ] **Integration:** add/remove/reorder portfolio; private-rates payload omits `rates`; view increments for non-owner only.
- [ ] **E2E (share loop):** creator adds work + sets pitch → publishes → copies link → open in a fresh session (anon) → counter increments → paste link unfurls a rich preview.
- [ ] **Manual:** OG unfurl on WhatsApp/IG/Twitter/iMessage; QR scans to the right URL; mobile kit layout; "Tarifas a consultar" when hidden.

## Definition of Done (Phase 1)

> A creator builds a media-kit-grade profile (pitch + work samples + stats + brands + optional rates), shares one link that unfurls beautifully across WhatsApp/IG/email, and sees an owner-excluded view count — the share loop has a heartbeat.

> Next: **Step 4 — code review** of the current `/c/[username]` page, profile editor, and OG/metadata setup against these blocks.
