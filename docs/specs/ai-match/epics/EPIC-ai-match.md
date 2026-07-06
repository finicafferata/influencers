# EPIC — AI Brief-to-Match (Phase 2)

*Status: Draft · Wraps AM-01…06 · Depends on: Slice 1 (search loop, shipped)*

## Goal
Turn search from "filters you operate" into "an answer you act on": a brand writes a campaign brief in plain Spanish and gets a deterministically-ranked shortlist with a grounded one-line reason per creator. The differentiator that justifies the structured-profile standard.

## Value milestone (Gate B / Definition of Done)
An org writes a brief, reviews/edits the parsed criteria, gets ranked matches (honest first, a labeled approximate set when inventory is thin) each with a one-line reason and an expandable score breakdown, thumbs-rates them, and contacts directly — LLM server-side with ≤2 calls per run, and the whole thing still works (guided mode, no rationales) with no API key.

## Estimates: `S` <½d · `M` ½–1d · `L` 1–2d.

Decisions in force: cheapest small model, server-side, 2 calls/run · one-line grounded rationales · honest→relaxed split · parsed criteria shown+editable · **feedback per-org** · thumbs in v1 · deterministic scoring in the API · extract `<CreatorCard>`/`<CreatorFilters>`.

---

### Backend

### ISS-AM.1 — MatchFeedback schema + retrieval/card refactor · `M` · `[AM-01]`
`MatchFeedback` (per-org unique) + 3 back-relations + migration; extract `buildCreatorWhere` + `CreatorFilter` type + `CREATOR_CARD_INCLUDE`/`toCardPayload` into `retrieval.ts`; `search.creators` consumes them.
**Acceptance:** migration applies; **`search.creators` returns byte-identical results** post-refactor (regression).
**Deps:** —. **Review:** behavior-preserving; per-org key confirmed.

### ISS-AM.2 — Deterministic scoring · `S` · `[AM-02]`
Pure `matchScore(criteria, candidate) → { score, breakdown }`; 5 components, neutral-when-unspecified, documented weights.
**Acceptance:** deterministic; unit tests cover each component + weights.
**Deps:** —. **Review:** weights + reach curve approved.

### ISS-AM.3 — LLM interface + service + context DI · `M` · `[AM-03]` ⚠️ riskiest
`LlmClient` interface (trpc) + `LlmService`/`LlmModule` (api, cheapest model, env, null-when-no-key) + DI wiring (**`LlmModule` → `TrpcModule`**, inject into `TrpcRouter`, set `ctx.llm`).
**Acceptance:** with key → parse + rationales work; no key → `enabled=false`, no crash, **no key in web bundle**; DI resolves; service satisfies the interface.
**Deps:** —. **Review:** DI into TrpcModule (silent-failure trap); model + token/budget ceiling.

### ISS-AM.4 — `match` router (parseBrief / run / feedback) · `L` · `[AM-04]`
Orchestration with rate limits, honest→relaxed split, batched grounded rationale; `feedback` upsert per-org; registered in root.
**Acceptance:** brief → ranked exact matches (deterministic) + one-line reasons; narrow brief → short honest + labeled approximate; no-LLM still ranks; ≤2 model calls/run; feedback upsert idempotent.
**Deps:** AM.1, AM.2, AM.3. **Review:** thresholds, rationale facts, rate limits.

### Frontend

### ISS-AM.5 — Extract `<CreatorCard>` + `<CreatorFilters>` · `M` · `[AM-05]`
Move inline search card + filter sidebar into reusable components (with a card `footer` slot); refactor `/search` to consume them — **no behavior change**.
**Acceptance:** `/search` works identically (filters, URL sync, sort, pagination, drawer→contact); components render standalone.
**Deps:** —. **Review:** component API; OK to touch shipped search UI.

### ISS-AM.6 — `/match` page · `L` · `[AM-06]`
Org-gated route; brief textarea + guided mode; parse→edit→run; ranked `<CreatorCard>`s with rationale + score breakdown + thumbs + contact; labeled approximate section; loading/empty/error; mobile-first.
**Acceptance:** the DoD flow end-to-end; approximate shows only when present; degraded mode (no LLM) works.
**Deps:** AM.4, AM.5. **Review:** parse→edit→run UX; entry points.

---

## Build order
ISS-AM.1 + AM.2 + AM.3 (parallel) → AM.4; AM.5 in parallel → AM.6.

## Human review plan
- **Gate A (before code):** approve the per-org feedback key, scoring weights, the LLM model + per-brief budget ceiling, and the search-UI refactor. Tick each task's Human-review list.
- **Per-issue:** PR confirms the search regression parity (AM.1/AM.5), the DI-into-TrpcModule wiring + no-key degradation (AM.3), determinism + ≤2 calls/run (AM.2/AM.4).
- **Gate B (before close):** demo the brief→match→contact flow end-to-end (DoD) — basis for Step 9 manual testing.

## Out of scope (backlog)
Learning-to-rank from outcomes (D1), budget-aware matching (D2), audience-fit matching (D3, needs Phase 3), multi-creator bundles (D4), brief templates (D5), Redis-backed rate limiting for multi-instance LLM-cost protection.
