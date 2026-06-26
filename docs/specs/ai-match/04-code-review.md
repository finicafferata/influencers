# AI Brief-to-Match — Step 4: Code Review (existing vs. modify vs. missing)

*Phase 2 · Date: 2026-06-07 · Status: Findings for human review*
*Mapped to `03-checklist.md` blocks, grounded in actual file contents.*

## TL;DR
**~55–60% already in place** as reusable substrate, with a clean, well-precedented surface for the net-new ~40%. The feature is mostly "wrap existing retrieval + add an LLM layer + a scoring fn + a page."

Legend: ✅ reusable · 🟡 modify · ❌ net-new.

## Block 1 — Schema + shared retrieval
- 🟡 **Extract `buildCreatorWhere`**: `search.ts` `buildWhere` (lines 25–64) is **pure** (no ctx/DB), safe to extract into a shared module (e.g. `packages/trpc/src/retrieval.ts`). `buildOrderBy` stays private (match scores in memory, not via SQL order).
  - ⚠️ **Coupling:** `buildWhere` is typed to the full `CreatorSearchInput` (`q`/`sort`/`cursor`/`limit`). Sharing with match's `ParsedCriteria` cleanly needs a **narrower shared filter type** (a `Pick` of the filter fields) — not a literal copy.
- ❌ **`MatchFeedback` model** — net-new; FKs to `Organization`/`User`/`CreatorProfile` (all clean cuid PKs); add 3 back-relations.
  - ⚠️ **Upsert needs `@@unique([orgId, creatorId])`** — the spec's field list never states it, but "one row per org+creator (upsert)" is unenforceable without it. Follow the `Favorite @@unique([userId, creatorId])` precedent.

## Block 2 — Deterministic scoring
- ❌ `matchScore.ts` — net-new pure function. No blockers; uses fields already on the card payload (niches, maxFollowers, maxEngagement, contentType, country).

## Block 3 — LLM interface + context + impl
- 🟡 **Context wiring** is the **identical pattern** to `db`/`userId`: add `llm?: LlmClient` to `Context` (trpc.ts) and set it in `createContext` (apps/api `trpc.router.ts:92–96`). `orgProcedure` spreads ctx (`next({ ctx: { ...ctx, … } })`), so `ctx.llm` is visible in match procedures. Optional type forces the null-check that drives the degrade path.
- ❌ **`LlmClient` interface** (`packages/trpc/src/llm.ts`) + **`LlmService`/`LlmModule`** in `apps/api` — net-new; the only new SDK dependency (none today). Mirror `EmailService` exactly: env via `process.env` in `onModuleInit`, `client = null` when no key (the graceful-no-key contract).
  - ⚠️ **Riskiest wiring:** `TrpcRouter` lives in `TrpcModule`, so **`LlmModule` must be imported into `TrpcModule`** (not just `app.module.ts`) or DI won't resolve the constructor param. And the Nest `LlmService` class must structurally satisfy the `packages/trpc` `LlmClient` interface across the package boundary.

## Block 4 — `parseBrief`
- ❌ net-new. `orgProcedure('can_search_creators')` exists and works; validate parsed niches against `NICHE_SLUGS`, clamp numbers. Add `rateLimit` (LLM cost).

## Block 5 — `run`
- 🟡 **Reuse retrieval + card projection**: `search.creators` already returns the exact card shape (`search.ts:110–123`) via an `include` of ordered `socialAccounts` + `user{name,avatar}`. Extract a shared `toCardPayload(profile)` + the include so `match.run` returns `{ creator, score, breakdown, rationale? }` and the existing card renders unchanged.
- ❌ The scoring loop, honest/relaxed split, and batched rationale call are net-new. Add `rateLimit` (tighter than contact — each run ≤2 model calls).

## Block 6 — `feedback`
- ❌ net-new; upsert depends on the `@@unique([orgId,creatorId])` above. Note: keying on (org,creator) means `userId` records "who last voted," not per-user feedback — confirm intended.

## Block 7 — `/match` UI
- ✅ `ContactButton` is standalone and reusable as-is (self-gates on capability) — the E5 contact loop drops in.
- 🟡 **Underestimated:** the search **creator card and filter controls are inline JSX with local state**, NOT components. To reuse on `/match` (and its editable-criteria step), extract `<CreatorCard>` and `<CreatorFilters>` (state lifted). The primitives + `NICHES/PLATFORMS/COUNTRIES` are already shared, so it's mechanical but real refactor work.
- ❌ The `/match` page, brief input, parsed-criteria edit, ranked results + rationale + breakdown + thumbs are net-new.

## Cross-cutting
- ✅ **No `$extends`/recompute conflict:** adding `llm` to Context is orthogonal to `PrismaClientExtended`; `MatchFeedback` writes don't touch the `socialAccount`-scoped recompute.
- ✅ **`rateLimit`** is exported and composable on `orgProcedure` (as `contact.send` does); in-memory/per-instance caveat is the same already-accepted limitation.

## Net assessment
**~55–60% reusable.** Load-bearing net-new: `LlmClient` interface, `LlmService`/`LlmModule`, `matchScore.ts`, the `match` router, the `/match` page. Modify: Context+createContext, TrpcRouter+TrpcModule, the search where-builder + card-projection extraction, the schema, and the card/filter component extraction.

**Single riskiest integration point:** the **NestJS DI wiring of `LlmService` into `createContext`** — silent-failure trap if `LlmModule` isn't imported into `TrpcModule`, plus the cross-package structural-typing of `LlmService` ⇒ `LlmClient`.

**Harder than it looks:** (1) extracting the inline search card + filters into reusable components (Block 7), (2) the `@@unique([orgId,creatorId])` the upsert silently needs (Block 6), (3) the shared filter type for the where-builder refactor (Block 1).

> Next: **Step 5 — per-task specs**, then epic/issues, then build.
