# CreatorLink — MVP Product Vision

*Step 1 of the product workflow · Date: 2026-06-07 · Author: Product (influencer-marketing)*
*Status: Draft for human review*

---

## 0. How to read this document

This is the **Step 1** deliverable: a product vision grouped from **Essential → Desired**. It does *not* contain implementation detail, checklists, or issues — those come in Steps 2–6. The goal here is to agree on **what we are building, for whom, and in what order of value** before we touch code.

Decisions locked for this MVP:

| Decision | Choice |
|----------|--------|
| Wedge | **Balanced two-sided** — close the minimum loop on both supply and demand |
| Market | **LATAM, Spanish-first** UX, country/city-aware, multi-platform |
| First slice | **Creator Discovery & Search** (demand anchor) + the minimum profile it needs to surface |

---

## 1. Vision statement

> CreatorLink is the **professional layer for the creator economy in LATAM**. Creators publish one standardized, verified-feeling profile; brands and agencies discover, shortlist, and contact them through structured search instead of DMs and spreadsheets.

The wedge is **trust + structure** in a market that today runs on Instagram DMs, WhatsApp groups, and informal rate cards. We are not a campaign-management tool yet, and we are not a payments rail yet. We are the **discovery and contact layer** — the place where the relationship starts.

### Why now / why LATAM
- The LATAM creator market is large, fast-growing, and **underserved by structured tooling** — most discovery happens manually.
- Spanish-first UX and local context (country, city, platform mix, local brand names) are a real differentiator versus US-centric incumbents.
- A two-sided loop is defensible: creators bring inventory, brands bring demand, and the structured-profile standard compounds.

---

## 2. Target users & core jobs

### Supply side — Creators & UGC creators
- **Independent creator**: wants a single professional link to share with brands instead of a media kit PDF.
- **Represented creator**: same, but discoverable through their talent agency's roster.
- **Core job**: *"Give me one credible profile that makes brands take me seriously and reach out."*

### Demand side — Brands, marketing agencies, talent agencies
- **Brand / marketing agency** (`can_search_creators`): wants to find creators that fit a brief (niche, country, platform, follower band, engagement) and contact them fast.
- **Talent agency** (`can_represent_creators`): wants to manage and showcase a roster.
- **Core job**: *"Find creators that match my campaign and reach out — without living in DMs and spreadsheets."*

### Platform
- **Admin**: seed/curate inventory, moderate, unblock the loop manually while it's small.

---

## 3. The core marketplace loop (the thing that must work)

```
Creator publishes profile  ──►  Org searches & filters  ──►  Org opens creator card
        ▲                                                              │
        │                                                              ▼
   Notification / email  ◄──────────────  Org sends structured contact
```

If a creator can publish a profile, an org can find it, and an org can contact the creator — **the MVP has a heartbeat.** Everything in the Essential tier below exists to make that single loop real and trustworthy. Everything else is sequencing.

---

## 4. Current state (verified against the repo, 2026-06-07)

| Area | State | Notes |
|------|-------|-------|
| Monorepo scaffold | ✅ Built | Turborepo, Next.js 15, NestJS, tRPC, Prisma, shared `ui`/`db`/`trpc` packages |
| Auth | ✅ Built (backend) | Magic-link + Google OAuth modules in NestJS; web has login + verify pages |
| Database schema | ✅ Built | Full Prisma schema: User, Organization, OrganizationMember, CreatorProfile, SocialAccount, PortfolioItem, Collaboration, TalentAgencyRoster, CreatorManager, List, ListItem, Favorite, Contact, Notification |
| tRPC API surface | ⚠️ **Empty** | Only a `health` router exists. **No** creator/org/search/contact procedures yet |
| Web app screens | ⚠️ **Minimal** | Landing, login, auth-verify, health only. No onboarding, profile, search, dashboard, or contact UI |
| Role selection / onboarding | ❌ Missing | Schema supports it; no flow built |
| Admin panel | ❌ Missing | `isAdmin` flag exists; no UI |

**Implication:** the *foundation and data model are ahead of the features*. The schema already anticipates most of the MVP, so the work is overwhelmingly **tRPC procedures + web screens**, not database design. This de-risks delivery significantly.

---

## 5. Feature groups — Essential → Important → Desired

Three tiers. **Essential** = the loop has no heartbeat without it. **Important** = needed for a credible, retainable MVP but the loop technically works without it. **Desired** = clearly post-MVP; lives in the backlog, not the build.

### 🟥 Tier 1 — Essential (the heartbeat)

| # | Capability | Why it's essential |
|---|-----------|--------------------|
| E1 | **Role selection on first login** (creator vs org) | Routes every user into the correct half of the loop; nothing works without it |
| E2 | **Creator profile — create & edit** (basic info, niches, content type, social accounts + metrics, rates, bio) | Supply side. No profiles = nothing to discover |
| E3 | **Creator public profile page** | The shareable artifact creators actually want; the unit of inventory |
| E4 | **Org onboarding** (org creation + capability selection) | Demand side identity; gates search access |
| E5 | **Creator search + filters** (niche, country, platform, follower band, engagement) | The demand anchor — the single most defining feature of the product |
| E6 | **Creator card (org view)** | Where an org evaluates a creator and decides to reach out |
| E7 | **Structured contact** (org → creator, with campaign brief) + creator receives it | Closes the loop; the conversion event |

> **First vertical slice = E2 + E3 + E5 + E6 + E7**, with E1/E4 as the gates around them. See §6.

### 🟧 Tier 2 — Important (credible MVP, fast follow)

| # | Capability | Why it matters |
|---|-----------|----------------|
| I1 | **Saved lists / shortlists** (org) | Schema has `List`/`ListItem`; agencies think in rosters/shortlists, not single contacts |
| I2 | **Favorites** (org) | Lightweight "save for later"; low cost, high retention signal |
| I3 | **Notifications** (in-app, e.g. "you have a new contact") | Schema has `Notification`; pulls creators back to respond — keeps the loop warm |
| I4 | **Portfolio & past collaborations on profile** | Strong trust signal for brands; schema supports `PortfolioItem` + `Collaboration` |
| I5 | **Talent-agency roster view** | `can_represent_creators` orgs need to showcase managed creators |
| I6 | **Basic admin panel** (suspend users, seed/curate creators, view contacts) | Lets us hand-seed inventory and moderate while the loop is small |
| I7 | **Saved searches** | Demand-side retention; re-run a brief without rebuilding filters |

### 🟩 Tier 3 — Desired (backlog — explicitly NOT in MVP)

| # | Capability | Why it waits |
|---|-----------|--------------|
| D1 | **Verified metrics via social APIs** (real follower/engagement pull) | High-trust feature but heavy integration + API approvals; self-reported metrics are acceptable for MVP |
| D2 | **Internal messaging / inbox** | Email/contact bridge is enough to start; full messaging is a product in itself |
| D3 | **Creator reviews & ratings** | Needs liquidity (completed collaborations) before it's meaningful |
| D4 | **Payments / escrow** | Out of scope; we are discovery, not transactions, for now |
| D5 | **Campaign / contract management** | Adjacent product; revisit once discovery has traction |
| D6 | **Advanced creator analytics** | Nice for retention, not for the core loop |
| D7 | **React Native / Expo mobile app** (`apps/mobile`) | Web is mobile-first; native shell is a post-MVP investment |
| D8 | **AI matching / recommended creators for a brief** | Powerful, but needs data and a working manual search first |

---

## 6. First feature in depth — Creator Discovery & Search (the vertical slice)

### Why this is feature X
For a balanced two-sided loop, the slice that proves the product is **discovery**: it's the demand-side payoff *and* it forces the supply side to exist (you can't search nothing). Running the 9-step workflow on this slice exercises the most of the data model (profiles, social accounts, niches, filters, contact) and produces a demoable, end-to-end loop.

### Scope of the slice
The minimum set that makes search real and closes the loop:

1. **Creator can publish a profile** (E2) — enough fields to be searchable and credible: username, country/city, content type, niches, at least one social account with followers + engagement, optional rates/bio.
2. **Public profile page** (E3) — the shareable, viewable artifact.
3. **Org can search & filter** (E5) — niche, country, platform, follower band, engagement range; results as creator cards.
4. **Org can open a creator card** (E6) — full evaluation view.
5. **Org can send a structured contact** (E7) — with a campaign brief; creator receives it (notification + email bridge).

### Explicitly out of this slice (deferred to fast-follow or backlog)
Saved lists, favorites, saved searches, roster view, verified metrics, messaging, reviews, payments. These are sequenced *after* the loop has a heartbeat.

### What "done" looks like for the slice
A seeded creator profile is **findable by an org through filters**, the org can **open the card and send a contact with a brief**, and the **creator is notified** — all on Spanish-first, mobile-first UI, end-to-end through the real tRPC + Prisma stack.

---

## 7. Sequencing summary

| Stage | Build | Outcome |
|-------|-------|---------|
| **Slice 1 (now)** | E1, E2, E3, E4, E5, E6, E7 | The loop has a heartbeat — demoable two-sided flow |
| **Slice 2 (fast follow)** | I1–I7 | Credible, retainable MVP; admin can seed & moderate |
| **Backlog** | D1–D8 | Tracked but not built; revisited after traction |

---

## 8. Open questions for human review

1. **Metrics trust for MVP:** are self-reported follower/engagement numbers acceptable for launch (D1 deferred), or is even a lightweight verification badge a Tier-1 requirement to be credible to brands?
2. **Contact channel:** is an **in-app notification + email bridge** enough for E7, or do brands expect a reply-to email thread from day one?
3. **Seeding strategy:** do we hand-seed the first cohort of creators via the admin panel (I6) before opening org search, or launch supply + demand simultaneously?
4. **Rates visibility:** are creator rates **public on the profile**, gated behind org login, or hidden until contact? (Affects E3 vs E6 field placement.)
5. **Niche taxonomy:** fixed controlled vocabulary of niches (better search, our curation) vs free-text tags (faster, messier)?

> Please review §5 tiers and §6 slice scope. Once the tier placement and the five open questions are settled, we proceed to **Step 2: detailed implementation, point by point** for the Creator Discovery & Search slice.
