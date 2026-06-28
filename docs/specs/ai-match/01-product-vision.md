# AI Brief-to-Match — Product Vision (Step 1)

*Phase 2 of the feature roadmap · Date: 2026-06-07 · Status: Draft for human review*

## 0. How to read this
Step 1 = product vision, grouped **Essential → Desired**. No implementation detail (Step 2). Goal: agree on what we're building and why.

## 1. Vision statement
> A brand describes a campaign in plain language; CreatorLink returns a **ranked shortlist of creators with a reason for each match** — turning search from "filters you operate" into "an answer you act on."

Today the brand does the work: pick niche, country, platform, follower band, sort, scan. AI brief-to-match flips it — paste *"Busco micro-influencers de belleza en México, 20–80k seguidores, buen engagement, para una campaña de skincare"* and get back the best-fit creators, each with a one-line "why." It's the clearest "this isn't just DMs and spreadsheets" wedge, and it's cheap because we already have the structured data and the search layer.

## 2. Approach decision (locked) — Hybrid
- **LLM does the fuzzy parts:** (a) parse a free-text brief into structured criteria (niches, country, platform, reach band, engagement floor, content type, budget), and (b) write a short, grounded "why this creator fits" rationale.
- **Deterministic heuristic does the ranking:** a transparent score over our structured fields (niche overlap, reach fit, engagement, content-type/country match). 
- **Why:** explainable + testable ranking; the LLM can't invent creators or fake numbers (rationale is grounded in real fields); cost is bounded (one parse + brief rationales); degrades gracefully to pure heuristic if the LLM is down or disabled.

## 3. Who & the job
- **Brand / agency:** *"I have a campaign in my head; give me the creators to contact, ranked, with a reason — without me learning the filter UI."*
- **Platform:** higher brief→contact conversion than manual search; a differentiator that justifies the structured-profile standard.

## 4. Current state (what we build on)
| Piece | State |
|-------|-------|
| `search.creators` (filters, denormalized `maxFollowers`/`maxEngagement`, cursor, total) | ✅ Built — the candidate-retrieval layer |
| Structured creator data (niches, platform metrics, content type, country, rates) | ✅ Rich enough to score against |
| Any LLM integration / API key | ❌ None yet |
| Brief parsing / scoring / rationale | ❌ Net-new |
| Inventory depth (matches improve with supply) | ⚠️ Thin pre-traction → Phase 1 media kit feeds this |

**Implication:** retrieval already exists. The net-new work is a **brief→criteria parse, a scoring function, and grounded rationales** — a focused layer on top of search.

## 5. The match flow
```
Brand writes brief (free-text or guided form)
        │
        ▼
LLM parse → structured criteria  ──►  search.creators (candidate retrieval)
        │                                      │
        ▼                                      ▼
  deterministic score + rank  ◄────────  candidate set
        │
        ▼
ranked matches + per-creator "why"  →  open card  →  contact (existing loop)
```

## 6. Feature groups — Essential → Important → Desired

### 🟥 Essential (no match feature without it)
- **E1 — Brief input:** a free-text box *and* a light guided form (so it works with or without the LLM).
- **E2 — Brief → criteria:** LLM parses free-text into the structured criteria `search.creators` already understands; the guided form bypasses the LLM. Always show the parsed criteria so the brand can correct them.
- **E3 — Deterministic match scoring + ranking:** score candidates by niche overlap, reach-fit to the target band, engagement, content-type and country match; rank; explainable.
- **E4 — Ranked results with grounded "why":** each match shows a short rationale generated from the creator's real fields (never invented metrics).
- **E5 — Match → contact:** open the existing creator card and contact — reuse the loop; no new contact path.

### 🟧 Important (credible, fast follow)
- **I1 — Save & re-run briefs** (demand-side retention; ties to the backlog "saved searches").
- **I2 — Refine:** edit the parsed criteria or nudge weights and re-rank.
- **I3 — Score breakdown:** show *why ranked here* (the component scores) for trust.
- **I4 — Feedback signal:** thumbs up/down per match (data for future ranking).

### 🟩 Desired (backlog)
- **D1 — Learning-to-rank** from contact/accept outcomes.
- **D2 — Budget-aware matching** (brief budget vs creator rates).
- **D3 — Audience-fit matching** (needs Phase 3 audience demographics).
- **D4 — Multi-creator campaign bundles** (a balanced set, not just a list).
- **D5 — Brief templates** per campaign type.

## 7. Success metrics
- **Conversion:** brief → contact rate vs. manual search baseline.
- **Quality:** match acceptance rate (creators accepting AI-sourced contacts); thumbs-up ratio.
- **Adoption:** % of org sessions that use brief-match vs. manual filters; saved/re-run briefs.
- **Cost:** LLM spend per brief (must stay well under contact value).

## 8. Open questions for human review
1. **LLM provider & cost ceiling:** which model/provider, and a hard per-brief budget? (Parse + N short rationales — batch the rationales in one call.)
2. **Rationale depth:** one line per match vs. a short paragraph? (Cost + latency vs. persuasiveness.)
3. **Thin-inventory behavior:** when few candidates match, do we relax criteria automatically ("no exact matches — here are close ones") or return a short honest list?
4. **Parsed-criteria transparency:** always show + let the brand edit the parsed filters (recommended), or run silently?
5. **Where ranking lives:** scoring in the API (tRPC procedure) — confirm; and is the LLM call server-side only (yes, for key safety)?
6. **Feedback now or later:** ship I4 thumbs in v1 to start collecting ranking data, or defer?

> Review §6 tiers + the questions. Then Step 2 — detailed implementation (brief parse, scoring function, rationale generation, the `match` procedure on top of `search`).
