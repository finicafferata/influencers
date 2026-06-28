# TASK-02 — Schema Deltas + Niche Taxonomy

*Critical path 🔴 · Depends on: none (parallel with TASK-01)*

## Objective
Add the additive schema fields the slice needs, the search indexes, and the controlled niche taxonomy constant. Reconcile the seed.

## Decisions made (best-practice) — REVISED per REVIEW-01
- **All changes additive** — no destructive migration; existing rich schema (List/Favorite/Roster) stays untouched for later slices.
- **`maxFollowers` AND `maxEngagement` denormalized** onto `CreatorProfile`, both kept in sync by a **single Prisma client extension on `SocialAccount` writes** (not per-procedure) so seed + admin paths can't drift. *(Engagement denorm is required so the engagement sort has a keyset-stable cursor — REVIEW-01 C5.)*
- **Partial unique index on `Contact`** `(fromUserId, toCreatorId) WHERE status='pending'` (raw SQL) — DB-level contact dedupe (REVIEW-01 C3).
- **`pg_trgm` extension + trigram GIN index** on `headline`/`username` so search `q` isn't a seq scan (REVIEW-01 moderate #4).
- **Shared `CAPABILITIES` constant** alongside `NICHES`/`PLATFORMS` (REVIEW-01 moderate #7).
- **Niche taxonomy as a versioned code constant** `{slug, labelEs}[]` in a new `packages/taxonomy` (or `packages/trpc/src/taxonomy.ts`). 20 LATAM niches (approved list in REVIEW-01 / EPIC-1). Slugs stable English; labels Spanish.
- **Tags are free text**, normalized (trim, lowercase, dedupe, max 10, ≤30 chars each).

## Scope
**In:** profile fields (`published`, `tags`, `headline`, `maxFollowers`), social-account verification fields, search indexes, taxonomy constant, seed reconcile.
**Out:** `Niche` DB table (deferred), any procedure logic (TASK-03).

## Requirements
1. **`CreatorProfile`** add: `published Boolean @default(false)`, `tags String[] @default([])`, `headline String?`, `maxFollowers Int @default(0)`, `maxEngagement Float @default(0)`.
2. **`SocialAccount`** add: `verified Boolean @default(false)`, `verificationSource String?`, `verifiedAt DateTime?`.
3. **Indexes:** `@@index([country])`, `@@index([contentType])`, `@@index([maxFollowers])`, `@@index([maxEngagement])`, `@@index([published])` on `CreatorProfile`; GIN on `niches` and `tags` via raw SQL (`USING gin`); `CREATE EXTENSION IF NOT EXISTS pg_trgm` + trigram GIN on `headline` and `username`; **partial unique** `CREATE UNIQUE INDEX ... ON "Contact"(fromUserId, toCreatorId) WHERE status='pending'`.
4. **Taxonomy constant:** `NICHES: { slug: string; labelEs: string }[]` (e.g. `{slug:'beauty',labelEs:'Belleza'}`). Export a `Set` of slugs for validation and a slug→label map for rendering. Seed ~15–20 LATAM-relevant niches.
5. **Platform + capability constants:** `PLATFORMS = ['instagram','tiktok','youtube','twitch','x','other']` and `CAPABILITIES = ['can_search_creators','can_represent_creators']` shared for validation.
5b. **Recompute extension:** a Prisma client extension that, on any `SocialAccount` create/update/delete, recomputes the owning profile's `maxFollowers` (max followers) and `maxEngagement` (engagement of the max-follower account, or max engagement) — the single sync path for all callers.
6. **Seed reconcile:** update `seed.ts` so María's niches use **slugs**, set `published: true`, populate `maxFollowers` (= max social followers), and leave `verified:false`/`self_reported`.

## Contracts
```ts
NICHES: { slug: string; labelEs: string }[]
NICHE_SLUGS: Set<string>
nicheLabel(slug): string   // for UI rendering
PLATFORMS: readonly string[]
```

## Acceptance criteria
- `prisma migrate` applies cleanly; client regenerates; GIN indexes present (verify via `\d+`).
- `pnpm db:seed` runs and produces a **published** María with `maxFollowers=120000` and slug-based niches.
- Taxonomy constant importable from web + api with no circular deps.

## Test plan
- Migration applies on a clean DB and on a DB with existing rows (defaults backfill).
- Unit: `nicheLabel` mapping; slug validation set.

## Human review
- [ ] Approve niche taxonomy as a code constant (vs DB table editable by marketing).
- [ ] Review/approve the initial ~15–20 niche list (Spanish labels) — *attach proposed list for sign-off*.
- [ ] Approve the platform enum set.
- [ ] Confirm `maxFollowers` denormalization over raw-SQL aggregation.
