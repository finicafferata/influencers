# AM-02 — Deterministic match scoring (pure)

*Backend · Depends on: none*

## Objective
A pure, unit-tested scoring function — the explainable core of ranking.

## Requirements
1. **`packages/trpc/src/matchScore.ts`**: `matchScore(criteria: ParsedCriteria, c: Candidate): { score: number; breakdown: Record<string, number> }`.
2. Components in [0,1], each **neutral 1 when the criterion is unspecified**:
   - `niche` = |matched ∩ requested| / |requested|
   - `reach` = 1 inside [followersMin,followersMax]; linear partial just outside; 1 if no band (use `c.maxFollowers`)
   - `engagement` = clamp(`c.maxEngagement` / target, 0..1); 1 if no floor
   - `contentType` = 1 if match or unspecified, else 0
   - `country` = 1 if match or unspecified, else 0
3. **Weighted sum** (default, documented, tunable): niche .4 · reach .25 · engagement .2 · contentType .1 · country .05. Return total + the per-component breakdown.
4. Pure: no ctx/DB/IO; deterministic.

## Acceptance
- Identical (criteria, candidate) → identical score; unspecified criteria don't penalize.
- Breakdown sums consistently with the weighted total.

## Test plan
- Unit: each component edge (in/out of band, partial reach, niche overlap fractions, unspecified→1); weight application; determinism.

## Human review
- [ ] Approve default weights.
- [ ] Approve reach "partial just outside" curve (or hard 1/0).
