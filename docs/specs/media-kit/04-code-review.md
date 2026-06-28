# Profile-as-Media-Kit — Step 4: Code Review (existing vs. modify vs. missing)

*Phase 1 · Date: 2026-06-07 · Status: Findings for human review*
*Mapped to `03-checklist.md` blocks, grounded in actual file contents.*

## TL;DR

**~35–40% already in place**, concentrated in *data + the public page's bones*. Reusable as-is: the whole `/c/[username]` SSR data flow, every formatter in `lib/format.ts`, the social-stat band, niches, the org-gated `ContactButton`, the UI primitive kit, the social-CRUD router pattern (clone it for portfolio), and a tRPC context that already exposes `userId` to public procedures (so `recordView` owner-exclusion is trivial). Schema deltas are clean/additive with no recompute or include conflicts.

Legend: ✅ exists & reusable · 🟡 exists, must modify · ❌ missing.

## Block 1 — Schema + constants
- ❌ `pitch`, `ratesPublic`, `viewCount` on `CreatorProfile` — none exist (schema.prisma:60–92). Additive with safe defaults.
- 🟡 `PortfolioItem` exists (schema.prisma:111–121: `id, creatorId, url, type, order`) — add `title`, `thumbnailUrl`.
- ❌ `PORTFOLIO_TYPES` constant — not in constants.ts (but `CONTENT_TYPES` is the pattern to copy).
- ❌ `lib/embed.ts` — does not exist.

## Block 2 — Portfolio + payload + fields
- ❌ `addPortfolioItem`/`removePortfolioItem`/`reorderPortfolio` — none; **the social-account CRUD trio (creator.ts:75/91/106) is the exact ownership-check pattern to mirror.**
- 🟡 `upsertProfile` + `pitch`/`ratesPublic` — adding them to `profileFieldsSchema` (schemas.ts:44) is sufficient; the field-spread flows unchanged.
- 🟡 `getByUsername` portfolio — `PUBLIC_PROFILE_INCLUDE` (creator.ts:10) already pulls `portfolio` ordered by `order` (all columns); new fields surface automatically. Tighten with an explicit `select`.
- ❌ **Server-side rates-stripping** when `ratesPublic=false` — `getByUsername` (creator.ts:149–161) returns `rates` verbatim. Must strip in the **return path of `getByUsername` only** (NOT the shared include — `getMine` still needs rates for the owner).

## Block 3 — View counter
- ❌ `recordView` — missing. **Verified feasible:** `apps/api/.../trpc.router.ts` resolves `userId` from the cookie on every request and puts it in `Context`, so `publicProcedure` sees `ctx.userId` → owner-exclusion (`ctx.userId === profile.userId`) works; `creatorProfile.update({ data: { viewCount: { increment: 1 } } })` is the write.
- 🟡 `getMine` returns `viewCount` — free once the column exists (shared include).
- 🟡 Keep `viewCount` off the public payload — strip in `getByUsername` return alongside rates.

## Block 4 — Portfolio editor + toggles
- ❌ Portfolio add/list/remove/reorder UI — none; **clone the social-account block (dashboard/profile/page.tsx:167–187).**
- ❌ Rates-visibility toggle + `pitch` field in editor — editor state/`save()` (page.tsx:23–32,72–90) covers only headline/city/country/bio/contentType/niches/tags.
- ❌ Gallery render via `lib/embed.ts`.

## Block 5 — Media-kit layout (`/c/[username]`) — a **restyle, not a rebuild**
- 🟡 Hero — avatar/@username/country/Verificado badge all present (page.tsx:31–44); add `pitch` + share button, restyle.
- 🟡 Stat band — exists (page.tsx:57–73) via `formatFollowers`/`formatEngagement`/`Stat`; make prominent.
- ✅ Niches — rendered (page.tsx:46–52).
- 🟡 Rates — rendered "desde {money}" (page.tsx:75–89); add `ratesPublic` branch → "Tarifas a consultar".
- 🟡 Collaborations — rendered as Badges (page.tsx:92–101); `Collaboration.brandLogo` exists but unused → upgrade to logos.
- ✅ "Contactar" — `ContactButton` (page.tsx:43) org-gated, reusable as-is.
- ❌ Work gallery — nothing renders portfolio (the headline gap).

## Block 6 — Dynamic OG previews
- ❌ `generateMetadata` — none; only **static** metadata in layout.tsx:16–19, **no OpenGraph/Twitter anywhere** (links unfurl as bare text today).
- ❌ `opengraph-image.tsx` / `ImageResponse` — none. **Feasible with no new dep:** `next/og` ships inside `next@^15`; `next.config.ts` doesn't block it.
- ⚠️ **Edge-runtime caveat (live):** do NOT reuse `getServerTrpc` in the OG route — it's `server-only` + cookie-bound (`next/headers`). Use a plain Node-runtime `fetch` to `${API_URL}/trpc/creator.getByUsername` (published-only), aggressively cached for crawlers.

## Block 7 — Share + view ping
- ❌ `<ShareKit>` — none.
- ❌ **QR: no dependency installed** — add one (`qrcode.react`) or hand-roll an inline SVG generator. Flagged.
- ❌ Dashboard "Compartí tu media kit" card — none.
- ❌ `recordView` per-session ping — needs a small `'use client'` island (the page is currently a pure server component).

## Block 8 — Analytics display
- ❌ "Tu media kit fue visto N veces" — none; trivial once `viewCount` flows through `getMine`.

## Cross-cutting
- ✅ **Formatters** — `formatFollowers`/`formatEngagement`/`formatMoney`/`countryLabel` all exist; reuse for kit + OG card.
- ✅ **No recompute/include conflict** — the `$extends` recompute is scoped to `socialAccount` only; new `CreatorProfile`/`PortfolioItem` fields are invisible to it. `viewCount` increment is a `creatorProfile.update` (not intercepted → no loop).
- ✅ **Portfolio confirmed schema-only, zero UI, no seed rows.**

## Net assessment

**~35–40% in place.** Load-bearing net-new work, in order of size:
1. **Portfolio:** CRUD router + `lib/embed.ts` + editor UI + gallery render — the largest chunk and the feature's headline gap.
2. **Dynamic OG stack:** `generateMetadata` + `opengraph-image.tsx` (no new dep on Next 15).
3. **Server-side rates-strip + viewCount exclusion** in `getByUsername` — small but security-relevant.
4. **`<ShareKit>` + QR (needs a dep/inline generator) + per-session view ping.**

**Single riskiest item:** the **dynamic OG image route's data fetch** — `getServerTrpc` is unsafe to reuse there (server-only, cookie-bound, separate NestJS API). Needs a deliberate Node-runtime fetch + crawler caching. This is genuinely new plumbing and the most likely thing to break unfurling in prod (matches Risk #1 in Step 2).

> Next: **Step 5 — per-task specs** for the net-new pieces, then epics/issues, then build.
