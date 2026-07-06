# CreatorLink — Feature Roadmap (post-Slice 1)

*Date: 2026-06-07 · Owner: Product (influencer-marketing) · Status: Proposed*

Slice 1 shipped the core loop: a creator publishes a structured profile → a brand searches/filters → contacts in-app. This roadmap sequences the next four features. They are **not independent bets** — each makes the next more valuable, so the order is chosen by cost + dependency, not just appeal.

## Sequencing logic

> Cheapest-and-feeds-everything → differentiator on top of what exists → moat once there's liquidity → monetize once there's volume.

| Phase | Feature | Goal | Why this order | Rough effort | Key dependency |
|-------|---------|------|----------------|--------------|----------------|
| **Now** | Profile-as-media-kit | Supply growth | No deps; grows the scarce side; every share = free acquisition; makes all three others more valuable | S–M | Portfolio UI + OG meta (small gaps in current code) |
| **Next** | AI brief-to-match | Differentiation | Builds on existing search; match quality improves as media-kit grows inventory | M | Search router (done); inventory from Phase 1 |
| **Later** | Audience data & quality | Brand trust (moat) | Costs $/lookup (Phyllo/Modash) or OAuth; only pays off with demand signal + inventory worth verifying | L | Data-provider contract; verification fields (already in schema) |
| **Later still** | Campaign management | Retention + revenue | Biggest surface; needs deal volume from the loop first; path to monetization | XL | Contact volume; payments decision |

## How this maps to the existing backlog

- **Media-kit** absorbs the deferred *portfolio media upload* item and elevates the public profile (already built) into a shareable artifact.
- **AI brief-to-match** is the backlog's *AI matching* item, pulled forward because search already exists.
- **Audience data** is the backlog's *OAuth/provider verification* — the schema's `verified`/`verificationSource`/`verifiedAt` fields were designed for exactly this, so it slots in with zero migration.
- **Campaign management** is the backlog's *contract management* + *payments*, sequenced last.

## Success metric per phase (so we know it worked)

- **Media-kit:** % of creators who share their kit; kit views; view→contact conversion; supply growth attributable to shares.
- **AI match:** brief→contact conversion vs. manual search; brand repeat-search rate.
- **Audience data:** brand trust signal (contact rate on verified vs. unverified); verified-inventory %.
- **Campaign management:** contacts that progress past "accepted"; eventually GMV.

## Working method

Each feature runs through the **same 9-step workflow** used for Slice 1 (vision → implementation plan → checklist → code review → specs → epics/issues → implementation → review → manual E2E), one at a time. We start with the media-kit.

> Next: `media-kit/01-product-vision.md` (Step 1 for Phase 1).
