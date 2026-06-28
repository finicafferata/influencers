# Profile-as-Media-Kit — Product Vision (Step 1)

*Phase 1 of the feature roadmap · Date: 2026-06-07 · Status: Draft for human review*

## 0. How to read this

This is **Step 1** for the media-kit feature: product vision grouped **Essential → Desired**. No implementation detail yet (that's Step 2). Goal: agree on what we're building and why before code.

## 1. Vision statement

> Turn every CreatorLink profile into a **shareable, brand-ready media kit** — the link a creator sends instead of a PDF. Each share is free, organic supply acquisition, and each view is a chance to pull a brand into the platform.

Today a creator's "media kit" is a Canva PDF emailed around with stale numbers. CreatorLink's public profile (`/c/<username>`) already has the raw material — metrics, niches, rates, verified badge, collaborations. The media-kit feature makes it **good enough to replace the PDF, and frictionless to share** — especially over WhatsApp and Instagram DMs, where LATAM creator deals actually happen.

### Why this feature, now
- It grows the **scarce side** (supply) at near-zero CAC: creators distribute the product for us.
- It's **cheap** — we're elevating something already built, not starting cold.
- It **compounds**: more shared kits → more inventory → AI match, audience data, and campaign management all become more valuable.

## 2. Who & the job

- **Creator / UGC creator:** *"Give me one always-up-to-date link that makes brands take me seriously — that I can drop in a WhatsApp chat or my IG bio."*
- **Brand / agency (viewer):** *"Show me, in 10 seconds, whether this creator fits — audience, reach, past work, rates — and let me reach them."*
- **The platform:** every external share is an acquisition surface; every view is a top-of-funnel event.

## 3. The share loop (the thing that must work)

```
Creator publishes kit → shares link (WhatsApp/IG/email)
        ▲                            │
        │                            ▼
  more creators join  ◄──  brand views kit → contacts / signs up
```

If the kit looks credible, shares cleanly (link unfurls with a rich preview), and converts a viewer into a contact or signup — the loop has a heartbeat.

## 4. Current state (what exists vs. what's missing)

| Piece | State | Note |
|-------|-------|------|
| Public profile `/c/[username]` (SSR) | ✅ Built | Header, per-platform metrics, niches, **public rates**, collaborations, Verificado badge |
| Portfolio (`PortfolioItem` model) | ⚠️ Schema only | No UI to add work samples and none rendered — the kit's biggest visible gap |
| Rich link previews (OpenGraph/Twitter) | ❌ Missing | `layout.tsx` has static metadata; no per-profile OG image/title — links unfurl as bare text today |
| Share affordances (copy link, QR, social) | ❌ Missing | No "share my kit" anywhere |
| View analytics | ❌ Missing | No tracking of kit views |
| PDF export | ❌ Missing | — |

**Implication:** most of the *data* is there; the work is **presentation, shareability, and a couple of small gaps (portfolio UI, OG meta).** Low-to-medium effort, high leverage.

## 5. Feature groups — Essential → Important → Desired

### 🟥 Essential (the share loop has no heartbeat without it)
- **E1 — Media-kit-grade profile layout:** a polished, scannable public profile — hero with name/photo/headline, key stats prominent, niches, work samples, past brands, rates, clear "Contactar" CTA. (Elevates the existing `/c/[username]`.)
- **E2 — Portfolio / work samples:** creator can add image/video/link samples (the `PortfolioItem` model exists); they render in the kit. Without visible work, it's not a media kit.
- **E3 — Rich link previews (OpenGraph/Twitter cards):** per-profile title, description, and a generated preview image so the link unfurls beautifully in WhatsApp/IG/email. This is what makes sharing *work* in LATAM.
- **E4 — One-tap share:** copy link + native share + QR code, surfaced in the creator dashboard with a clear "compartí tu media kit" prompt.

### 🟧 Important (credible, retainable; fast follow)
- **I1 — View analytics for the creator:** "tu media kit fue visto N veces" — a retention hook and the first creator-facing analytics.
- **I2 — Profile completeness meter:** nudges creators to finish (better supply quality, more shareable kits).
- **I3 — PDF export:** a downloadable one-pager brands can forward internally — directly replaces the Canva PDF.
- **I4 — Light customization:** short pitch/intro, choose which sections/stats show and their order.
- **I5 — Vanity/short link:** clean `creatorlink.app/mariag`-style link for bios.

### 🟩 Desired (backlog — not this phase)
- **D1 — Custom themes / branding / custom domain.**
- **D2 — Multiple kits per audience** (e.g., one per niche or per language).
- **D3 — Embeddable widget** for personal sites.
- **D4 — Auto-pull latest posts** from connected platforms (depends on the Phase-3 audience-data integration).
- **D5 — Lead-capture form** on the kit for non-CreatorLink brands.

## 6. Success metrics
- **Activation:** % of published creators who share their kit at least once.
- **Reach:** kit views; views per creator.
- **Conversion:** view → contact (logged-in brands) and view → signup (new orgs/creators).
- **Growth:** new creators attributable to a shared kit (referral signal).

## 7. Open questions for human review
1. **OG preview image:** dynamic generated image (Next OG image with stats/photo) vs. a simple static branded card? (Dynamic is more shareable, slightly more work.)
2. **Rates on a publicly shared link:** keep fully public (current Q4 decision) even now that the link is actively broadcast, or gate rates behind "contact" once the kit is a marketing surface?
3. **Portfolio media hosting:** allow URL embeds only (YouTube/IG/TikTok links + image URLs) for this phase, or include direct image upload (needs storage — currently deferred)?
4. **View analytics granularity:** simple view counter vs. per-day / referrer breakdown? (Counter is enough to start.)
5. **Anonymous vs. authed views:** count all views, or only meaningful ones (dedupe, exclude the owner)?

> Review §5 tiers + the five questions. Once settled, we proceed to **Step 2 — detailed implementation** for the media-kit feature.
