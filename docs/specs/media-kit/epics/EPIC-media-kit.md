# EPIC — Profile-as-Media-Kit (Phase 1)

*Status: Draft · Wraps MK-01…06 · Depends on: Slice 1 (shipped)*

## Goal
Turn the public profile into a shareable, brand-ready media kit so creators distribute CreatorLink for us — growing the scarce supply side at near-zero CAC. **The share loop has a heartbeat when a creator can build a rich kit, share a link that unfurls beautifully, and see it get viewed.**

## Value milestone (Gate B / Definition of Done)
A creator adds work samples + a pitch, (optionally) sets rate visibility, publishes, copies/QR-shares one link that unfurls as a rich card on WhatsApp/IG, and sees an owner-excluded view count — end-to-end on the real stack, Spanish-first, mobile-first.

## Estimates: `S` <½d · `M` ½–1d · `L` 1–2d.

Decisions in force: dynamic OG (Node runtime, direct API fetch, cached) · rates public-as-"desde" + hide toggle (stripped server-side) · URL embeds only · deduped owner-excluded view counter · QR via `qrcode.react`.

---

### Backend

### ISS-MK.1 — Schema deltas + constants + embed helper · `S` · `[MK-01]`
Add `CreatorProfile.pitch/ratesPublic/viewCount`, `PortfolioItem.title/thumbnailUrl`, `PORTFOLIO_TYPES` constant, and the pure `lib/embed.ts`.
**Acceptance:** migration applies on clean + seeded DB (defaults backfill); `getEmbed` returns correct `kind` per URL (unit).
**Deps:** —. **Review:** additive only; no recompute/include conflict.

### ISS-MK.2 — Portfolio CRUD router · `M` · `[MK-02]`
`addPortfolioItem` / `removePortfolioItem` / `reorderPortfolio` (creatorProcedure, ownership-checked, mirror social-account CRUD); extend `upsertProfile` with `pitch`/`ratesPublic`.
**Acceptance:** add/remove/reorder works and is ownership-scoped; invalid type rejected.
**Deps:** ISS-MK.1. **Review:** ownership guard on every mutation.

### ISS-MK.3 — Public payload privacy + recordView · `M` · `[MK-02]` 🔒
In `getByUsername` return path: explicit portfolio `select`; strip `rates` when `ratesPublic=false`; always omit `viewCount`. Add `recordView` (publicProcedure) incrementing `viewCount` except for the owner.
**Acceptance:** private-rates profile returns NO `rates` over the wire (owner's `getMine` still has them); non-owner view increments, owner view doesn't; `viewCount` never in public payload.
**Deps:** ISS-MK.1. **Review:** strip happens in `getByUsername` only, NOT the shared include; owner-exclusion correct.

### Frontend

### ISS-MK.4 — Profile editor: portfolio + pitch + rates toggle + analytics · `M` · `[MK-03]`
Portfolio section (add/list/remove/reorder via `lib/embed.ts` previews), pitch field, rates-visibility toggle, "visto N veces" line.
**Acceptance:** creator manages work samples; toggling rates off flips the public kit to "Tarifas a consultar"; pitch + view count show.
**Deps:** ISS-MK.2, ISS-MK.3. **Review:** reuses existing primitives; clones social-account block.

### ISS-MK.5 — Media-kit layout redesign + gallery · `L` · `[MK-04]`
Restyle `/c/[username]`: hero (avatar/name/pitch/badge/share), prominent stat band, work gallery, brand logo chips, rates-or-"a consultar", contact + share CTA; mobile-first.
**Acceptance:** the page credibly replaces a Canva media kit on mobile + desktop; each portfolio type renders; unpublished still 404s for non-owners.
**Deps:** ISS-MK.3. **Review:** restyle (not rebuild); reuses formatters/ContactButton.

### ISS-MK.6 — Dynamic OpenGraph (metadata + image route) · `M` · `[MK-05]` ⚠️ riskiest
`generateMetadata` (per-profile OG/Twitter) + `app/c/[username]/opengraph-image.tsx` on **Node runtime**, fetching the API directly (published-only), cached; branded card (photo/name/reach/niches/wordmark); generic fallback on missing.
**Acceptance:** `/c/<username>` unfurls a rich card on WhatsApp/IG/Twitter/iMessage; route does NOT import `getServerTrpc`; repeated crawler hits are cached.
**Deps:** ISS-MK.5. **Review:** Node runtime + direct fetch confirmed; cache TTL set; no crash on unknown user.

### ISS-MK.7 — ShareKit (copy/native/QR) · `S` · `[MK-06]`
`<ShareKit username>` with copy-link, `navigator.share()` + fallback, `qrcode.react` QR; surfaced on the kit hero and a "Compartí tu media kit" dashboard card. Add `qrcode.react` dep.
**Acceptance:** copy yields the correct public URL; native share opens on mobile; QR scans to the kit.
**Deps:** ISS-MK.5. **Review:** approve `qrcode.react` dep.

### ISS-MK.8 — Per-session view ping · `S` · `[MK-06]`
Client island on `/c/[username]` calling `recordView` once per session (sessionStorage guard).
**Acceptance:** visiting increments once per session; refresh doesn't double-count; owner never counts.
**Deps:** ISS-MK.3, ISS-MK.5. **Review:** isolated `'use client'` child; guard key per username.

---

## Build order
ISS-MK.1 → MK.2 + MK.3 (parallel) → MK.4 + MK.5 (parallel) → MK.6 + MK.7 + MK.8.

## Human review plan
- **Gate A (before code):** approve schema deltas, the `getByUsername` privacy contract (rates strip + viewCount omit), the OG runtime decision, and the `qrcode.react` dep. Tick each task's Human-review list.
- **Per-issue:** PR confirms ownership guards (MK.2/3), the strip-in-return-path-only rule (MK.3), Node-runtime + no `getServerTrpc` (MK.6).
- **Gate B (before close):** demo the share loop end-to-end (DoD above) — the basis for Step 9 manual testing.

## Out of scope (backlog / fast-follow)
PDF export, completeness meter, section customization, root-level vanity link (I2–I5); themes/custom domain, multi-kit, embed widget, auto-pull posts, lead-capture (D1–D5).
