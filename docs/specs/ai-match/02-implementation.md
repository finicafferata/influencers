# AI Brief-to-Match — Step 2: Detailed Implementation Plan

*Phase 2 · Date: 2026-06-07 · Status: Draft for human review*

## 0. Decisions locked (Step 1 review)

| # | Question | Decision |
|---|----------|----------|
| Q1 | LLM provider/cost | **Cheapest small model**; **one parse call + one batched-rationale call** per run; short outputs; provider/model via env |
| Q2 | Rationale depth | **One line per match (≤140 chars)**, batched in a single call |
| Q3 | Thin inventory | **Honest matches first**, then a clearly-labeled **"aproximados"** relaxed set |
| Q4 | Parsed criteria | **Always shown + editable** before running |
| Q5 | Ranking/LLM placement | **Deterministic scoring in the API**; **LLM server-side only**, injected into tRPC context (provider-agnostic interface; heuristic fallback) |
| Q6 | Feedback | **Thumbs in v1** to start collecting ranking data |

## 1. Scope
**In:** LLM interface + server impl; `match.parseBrief`, `match.run`, `match.feedback`; deterministic scoring; shared candidate retrieval; honest+relaxed split; `MatchFeedback` schema; `/match` UI.
**Out:** learning-to-rank, budget/audience-fit matching, bundles, templates (backlog D1–D5).

Builds on the existing `search.creators` retrieval and structured data — the net-new is parse + score + rationale.

## 2. LLM integration (server-side, cheapest model)

1. **Interface in `packages/trpc`** (`llm.ts`): `LlmClient { parseBrief(text): Promise<ParsedCriteria>; rationales(input): Promise<Record<string,string>> }`. The trpc package depends on the *interface only* — no provider SDK.
2. **Context**: add `llm?: LlmClient` to `Context`. Procedures use `ctx.llm` when present; when absent (not configured), free-text parse degrades (see §4.4) and rationales are omitted.
3. **Impl in `apps/api`** (`llm/llm.service.ts`): one provider client behind env `LLM_PROVIDER`, `LLM_MODEL` (default cheapest small model, e.g. a Haiku/Mini-class), `LLM_API_KEY`. Injected into `createContext` in `trpc.router.ts`. **Server-side only** — the key never reaches the browser.
4. **Cost guardrails:** exactly **two** model calls per match run (1 parse on `parseBrief`, 1 batched rationale on `run`); cap rationale targets at N=10; low `max_tokens`; optional in-memory cache of parse by `hash(text)`.

## 3. Schema delta
1. **`MatchFeedback`**: `id, orgId, userId, creatorId, vote ('up'|'down'), briefText String?, createdAt`. Indexes on `orgId`, `creatorId`. (No change to existing models.)

## 4. tRPC `match` router (orgProcedure: `can_search_creators`)

### 4.1 `parseBrief`
1. `match.parseBrief({ text })` → `ParsedCriteria { niches[], country?, platform?, followersMin?, followersMax?, engagementMin?, contentType?, budget? }`.
2. LLM prompt: "Extract structured campaign criteria as JSON; niches MUST be from this list [slugs]." Validate the JSON against our constants (drop unknown niches, clamp numbers). Return criteria for the UI to show + edit (Q4).
3. **Fallback (no LLM):** keyword-match the text against niche `labelEs`/slug + country names; return partial criteria; UI nudges toward the guided form.

### 4.2 `run`
4. `match.run({ criteria, limit=10 })`:
   - **Candidate retrieval** (§5): reuse a shared `buildCreatorWhere` (refactored out of `search.ts`) to fetch a broad published, non-suspended candidate set (cap ~100) matching the *core* constraints (niches/country).
   - **Score** every candidate with the deterministic function (§6); sort desc; tie-break `maxFollowers`.
   - **Honest/relaxed split (Q3):** matches with score ≥ `RELEVANCE_THRESHOLD` are "exactas"; if fewer than `MIN_GOOD` (e.g. 5), run a **second relaxed retrieval** (drop the most restrictive constraint — usually the reach band) and return those as `aproximados`, clearly separated.
   - **Rationales (Q2):** one batched LLM call over the top-N exact (+ a few relaxed) with each creator's key facts → `{ creatorId: "una línea" }`. Grounded: prompt restricts to provided facts, ≤140 chars, Spanish. Omit if no LLM.
   - Return `{ exact: Match[], approximate: Match[], criteria }` where `Match = { creator: CardPayload, score, breakdown, rationale? }`.

### 4.3 `feedback`
5. `match.feedback({ creatorId, vote, briefText? })` → upsert a `MatchFeedback` row for the caller's org. Fire-and-forget; powers future ranking (D1).

## 5. Shared candidate retrieval
1. Refactor `search.ts`'s where-builder into `buildCreatorWhere(input)` in a shared module so both `search.creators` and `match.run` use one source of truth. `match` retrieves a broad set (core constraints only) and scores in memory rather than relying on SQL ordering.

## 6. Deterministic scoring (`matchScore.ts`, pure + unit-tested)
1. Per candidate, components in [0,1]:
   - **niche overlap** = |matched ∩ requested| / |requested| (1 if no niche requested).
   - **reach fit** = 1 inside [followersMin,followersMax]; linear/partial just outside; 1 if no band.
   - **engagement** = clamp(maxEngagement / target, 0..1) (or 1 if no floor).
   - **contentType match** = 1/0 (1 if unspecified).
   - **country match** = 1/0 (1 if unspecified).
2. **Weighted sum** (default weights, documented + tunable later): niche .4, reach .25, engagement .2, contentType .1, country .05.
3. Return `{ score, breakdown }` so the UI can show *why ranked here* (I3).

## 7. Frontend — `/match` (orgProcedure-gated)
1. **Brief input:** free-text textarea + a "modo guiado" toggle exposing the same filter controls as `/search` (works without LLM).
2. **Parsed criteria:** after `parseBrief`, show editable chips/inputs (niches, country, platform, reach, engagement) — the brand confirms/corrects, then "Buscar".
3. **Results:** ranked cards (reuse the search creator card) with the **one-line rationale**, an expandable **score breakdown** (I3), **thumbs up/down** (I4 → `feedback`), and open-card → contact (existing loop). "Resultados aproximados" section rendered separately and labeled.
4. **States:** loading (LLM latency — show a spinner + "analizando tu brief"), empty, error; mobile-first.

## 8. Build order
| # | Block | Depends on |
|---|-------|-----------|
| 1 | §3 schema (`MatchFeedback`) + §5 shared `buildCreatorWhere` refactor | — |
| 2 | §6 scoring function (pure) | — |
| 3 | §2 LLM interface + context + api impl | — |
| 4 | §4.1 `parseBrief` | 3 |
| 5 | §4.2 `run` (retrieval + score + relaxed split + rationale) | 1,2,3 |
| 6 | §4.3 `feedback` | 1 |
| 7 | §7 `/match` UI | 4,5,6 |

## 9. Risks / call-outs
1. **LLM JSON reliability:** parse defensively (strict JSON parse + Zod-validate + clamp); never trust niche slugs without checking the constant; fall back to guided form on failure.
2. **Hallucinated rationale:** prompt is grounded ("use only these facts"), outputs are cosmetic (ranking is deterministic), and we show the score breakdown so trust doesn't rest on the LLM line.
3. **Cost/latency:** two calls/run, capped N, low max_tokens, parse cache. Confirm the per-brief budget ceiling.
4. **Thin inventory:** the relaxed split is the mitigation; quality still depends on supply (Phase 1 feeds it).
5. **Determinism:** scoring is pure and unit-tested; identical criteria → identical ranking (the LLM only affects parse + cosmetic text).

> Next: **Step 3 — checklist**, then code review (search refactor, context wiring), specs, epic/issues, build.
