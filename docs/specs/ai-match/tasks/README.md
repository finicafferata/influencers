# AI Brief-to-Match — Task Specs (Step 5)

*Phase 2 · Date: 2026-06-07 · Status: Draft for human review*

Per-task specs for the net-new + modify work (Step 4: ~55–60% reusable). Each becomes an epic/issue in Step 6.

## Decisions locked
- **Feedback per-org** — `MatchFeedback @@unique([orgId, creatorId])`; `userId` records who last voted.
- **Extract `<CreatorCard>` + `<CreatorFilters>`** from the search page into shared components; `/search` keeps working, `/match` reuses them.
- Plus Step-2 decisions: cheapest small model · server-side LLM, 2 calls/run · one-line grounded rationales · honest→relaxed split · parsed criteria shown+editable · thumbs in v1 · deterministic scoring in the API.

## Task index

| Task | Title | Layer | Depends on |
|------|-------|-------|-----------|
| [AM-01](AM-01-schema-retrieval.md) | MatchFeedback schema + shared retrieval/card refactor | backend | — |
| [AM-02](AM-02-scoring.md) | Deterministic match scoring (pure) | backend | — |
| [AM-03](AM-03-llm.md) | LLM interface + NestJS service + context DI | backend | — |
| [AM-04](AM-04-match-router.md) | `match` router: parseBrief / run / feedback | backend | AM-01,02,03 |
| [AM-05](AM-05-components.md) | Extract `<CreatorCard>` + `<CreatorFilters>` | frontend | — |
| [AM-06](AM-06-match-page.md) | `/match` page | frontend | AM-04, AM-05 |

Conventions match prior task specs: TS/Zod-style contracts, observable acceptance, a Human-review checklist per task.
