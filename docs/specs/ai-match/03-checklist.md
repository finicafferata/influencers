# AI Brief-to-Match — Step 3: Implementation Checklist

*Phase 2 · Date: 2026-06-07 · Status: Draft for human review*

Items back-reference Step 2 points `[§x]` (`02-implementation.md`). Product-level definition of done, not a code diff. Each block ends with a demoable **Acceptance**.

**Decisions applied:** cheapest small model, server-side, 2 calls/run · one-line grounded rationales · honest→relaxed split · parsed criteria shown+editable · thumbs in v1 · deterministic scoring in the API.

---

## Block 1 — Schema + shared retrieval `[§3, §5]`
- [ ] `MatchFeedback` model (`orgId, userId, creatorId, vote, briefText?, createdAt`) + indexes; migration applies `[§3.1]`
- [ ] Refactor `search.ts` where-builder into shared `buildCreatorWhere(input)`; `search.creators` still works unchanged `[§5.1]`

**Acceptance:** migration clean; existing search behaves identically after the refactor.

## Block 2 — Deterministic scoring `[§6]`
- [ ] `matchScore(criteria, candidate)` pure fn → `{ score, breakdown }` with the 5 components `[§6.1]`
- [ ] Weighted sum (niche .4 / reach .25 / engagement .2 / contentType .1 / country .05); unspecified criterion = neutral 1 `[§6.2]`
- [ ] Breakdown returned for UI transparency `[§6.3]`

**Acceptance:** identical criteria → identical ranking (deterministic); unit tests cover each component + the "unspecified = neutral" rule.

## Block 3 — LLM interface + context + impl `[§2]`
- [ ] `LlmClient` interface in `packages/trpc` (parseBrief, rationales) — no provider SDK in trpc `[§2.1]`
- [ ] `Context.llm?: LlmClient`; procedures use it when present, degrade when absent `[§2.2]`
- [ ] `apps/api` LLM service (env `LLM_PROVIDER/LLM_MODEL/LLM_API_KEY`, cheapest model) injected into `createContext`; key server-side only `[§2.3]`
- [ ] Cost guardrails: ≤2 calls/run, N≤10, low max_tokens, parse cache `[§2.4]`

**Acceptance:** with a key set, parse + rationale calls work; with no key, the feature still runs (heuristic parse, no rationales) — no crash, no key in the browser bundle.

## Block 4 — `parseBrief` `[§4.1]`
- [ ] `match.parseBrief({text})` (orgProcedure) → validated `ParsedCriteria` (niches ⊆ constant, numbers clamped) `[§4.1.1–2]`
- [ ] Fallback parse (keyword match) when no LLM `[§4.1.3]`

**Acceptance:** a Spanish brief yields sensible structured criteria; unknown niches are dropped; no-LLM path returns partial criteria without error.

## Block 5 — `run` `[§4.2]`
- [ ] Candidate retrieval via `buildCreatorWhere` (published, non-suspended, core constraints, cap ~100) `[§4.2]`
- [ ] Score + sort desc, tie-break `maxFollowers` `[§4.2]`
- [ ] **Honest set** = score ≥ threshold; if < MIN_GOOD, **relaxed retrieval** (drop reach band) → `approximate`, labeled `[§4.2]`
- [ ] One **batched** rationale call (≤140 chars/creator, Spanish, grounded in provided facts); omit if no LLM `[§4.2]`
- [ ] Returns `{ exact, approximate, criteria }` with `{ creator, score, breakdown, rationale? }` `[§4.2]`

**Acceptance:** a brief returns ranked exact matches with one-line reasons; a too-narrow brief returns a short honest set + a labeled "aproximados" set.

## Block 6 — `feedback` `[§4.3]`
- [ ] `match.feedback({creatorId, vote, briefText?})` upserts `MatchFeedback` for the caller's org; fire-and-forget `[§4.3.5]`

**Acceptance:** thumbs up/down persists; one row per org+creator (upsert).

## Block 7 — `/match` UI `[§7]`
- [ ] Brief textarea + "modo guiado" (same controls as `/search`) `[§7.1]`
- [ ] Editable parsed-criteria step before running `[§7.2]`
- [ ] Ranked cards (reuse search card) + one-line rationale + expandable score breakdown + thumbs + open-card→contact `[§7.3]`
- [ ] Separate, labeled "Resultados aproximados" section `[§7.3]`
- [ ] Loading ("analizando tu brief") / empty / error states; mobile-first; org-gated route `[§7.4]`

**Acceptance:** an org pastes a brief → reviews/edits criteria → sees ranked matches with reasons → opens a card → contacts; non-org users redirected.

---

## Verification & testing (Step 9 targets)
- [ ] **Unit:** `matchScore` per component + weights + neutral rule; `parseBrief` validation (niche filtering, number clamping); relaxed-split trigger.
- [ ] **Integration:** `run` over a seeded set returns correct ordering; relaxed set appears only when exact < MIN_GOOD; no-LLM degradation path.
- [ ] **Cost:** assert exactly ≤2 model calls per run (mock the LLM client).
- [ ] **E2E:** brief → criteria edit → results + rationale → thumbs → contact.
- [ ] **Manual:** Spanish brief quality; rationale groundedness (no invented numbers); mobile layout.

## Definition of Done (Phase 2)
> An org writes a campaign brief in plain Spanish, reviews the parsed criteria, and gets a deterministically-ranked shortlist with a grounded one-line reason per creator (honest matches first, a labeled approximate set when inventory is thin), can thumbs-rate them, and contacts directly — LLM server-side, ≤2 calls per run, graceful without a key.

> Next: **Step 4 — code review** (search where-builder refactor surface, context wiring) → specs → epic/issues → build.
