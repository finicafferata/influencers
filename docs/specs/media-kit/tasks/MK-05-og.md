# MK-05 — Dynamic OpenGraph (metadata + image route)

*Frontend (`/c/[username]`) · Depends on: MK-04 · The riskiest task (Step-4 risk #1)*

## Objective
Make a shared kit link unfurl as a rich preview card across WhatsApp/IG/Twitter/iMessage.

## Decisions
- **Node runtime** for the OG route; fetch the API directly (published-only); aggressively cache for crawlers. **Do NOT reuse `getServerTrpc`** (server-only + cookie-bound).
- Dynamic image via `next/og` `ImageResponse` (ships inside Next 15 — no new dep).

## Requirements
1. **`generateMetadata`** in `c/[username]/page.tsx`: `title = "@username — headline"`, `description` from pitch/niches, `openGraph` + `twitter` (summary_large_image) pointing at the image route. Handle not-found gracefully.
2. **`app/c/[username]/opengraph-image.tsx`**: `export const runtime = 'nodejs'`; `export const size = { width: 1200, height: 630 }`; fetch profile via `fetch(\`${process.env.API_URL}/trpc/creator.getByUsername?...\`)` (published-only) — NOT `getServerTrpc`; render an `ImageResponse` branded card: avatar (or initial), name, `@username`, top stat (reach), niche chips, CreatorLink wordmark.
3. **Caching**: set `revalidate`/cache headers so crawlers don't hammer the API; tolerate missing data with a generic fallback card.
4. Use the existing formatters (`formatFollowers`) for the stat.

## Acceptance
- Pasting `/c/mariag` into WhatsApp/IG/Twitter/iMessage unfurls a branded card with the creator's photo/name/stat (manual, Step 9).
- The OG route does not import `getServerTrpc`; runs on Node; cached.
- Unpublished/unknown username → generic fallback card, no crash.

## Test plan
- Manual unfurl across the 4 channels + a debugger (e.g. opengraph.xyz).
- Confirm repeated crawler hits are served from cache.

## Human review
- [ ] Approve Node-runtime + direct API fetch (vs edge).
- [ ] Approve card design content (photo + name + reach + niches + wordmark).
- [ ] Approve cache TTL.
