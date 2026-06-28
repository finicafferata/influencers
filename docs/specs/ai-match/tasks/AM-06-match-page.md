# AM-06 — `/match` page

*Frontend · Depends on: AM-04, AM-05 · org-gated*

## Objective
The brand-facing brief-to-match experience.

## Requirements
1. **Route `/match`** (org-gated like `/search`: non-org → `/dashboard`). Add a "Buscar con IA" entry from `/search` + dashboard.
2. **Brief input:** free-text `<textarea>` + "modo guiado" toggle showing `<CreatorFilters>`.
3. **Parse step:** on submit free-text → `match.parseBrief` → show editable parsed criteria via `<CreatorFilters>` (Q4); brand confirms/edits → "Buscar".
4. **Run + results:** `match.run` → render `<CreatorCard>` list; each card `footer`:
   - one-line **rationale** (when present),
   - expandable **score breakdown** (the per-component scores),
   - **thumbs up/down** → `match.feedback`,
   - open card → `ContactButton` (existing contact loop).
5. **Approximate section:** render `approximate` separately under a "Resultados aproximados" heading.
6. **States:** loading ("Analizando tu brief…" during LLM), empty, error; mobile-first.

## Acceptance
- Org pastes a Spanish brief → reviews/edits parsed criteria → sees ranked matches with reasons + breakdown → thumbs → opens a card → contacts.
- Approximate set shows only when present, clearly labeled.
- Works without an LLM key (guided mode + heuristic parse; no rationale text), no crash.

## Test plan
- E2E: brief → criteria edit → results → thumbs → contact.
- Manual: loading/empty/error; mobile; Spanish copy; no-LLM degraded mode.

## Human review
- [ ] Approve the two-step (parse→edit→run) flow vs. one-shot.
- [ ] Approve entry points (/search toggle, dashboard card).
