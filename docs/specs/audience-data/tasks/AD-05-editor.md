# AD-05 — Per-account audience editor

*Frontend · Depends on: AD-02*

## Objective
Let creators declare audience demographics per social account.

## Requirements
1. **`/dashboard/profile`** — under each social-account row (the existing social Card), an expandable **Audiencia** sub-form keyed by `s.id`:
   - Top-3 country selects + pct inputs (reuse `COUNTRIES`).
   - Age bands (`AGE_BANDS`) pct inputs.
   - Gender split (`GENDERS`) pct inputs.
   - Saves via `creator.setAudience({ socialAccountId, topCountries, ages, gender })`.
2. Show **declarada / verificada** state per account; a gentle hint if pcts don't sum ≈100 (non-blocking).
3. Reuse `Field`/`Input`/`Select` primitives; Spanish copy.

## Acceptance
- Creator enters/edits audience per account; saving updates the public kit; editing shows "declarada" until an admin verifies.

## Test plan
- Manual: per-account form; save + reflect on `/c/<username>`; pct-sum hint; mobile.

## Human review
- [ ] Approve compact per-account sub-form (vs a separate audience page).
