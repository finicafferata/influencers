# AD-02 — setAudience + admin verifyAudience

*Backend · Depends on: AD-01*

## Objective
The single creator write-path for audience data, and admin verification (mirrors metric verify).

## Requirements
1. **`creator.setAudience`** (creatorProcedure, ownership-checked):
   - input `{ socialAccountId, topCountries: [{ code, pct }] (≤3), ages?: Record<band, pct>, gender?: { female, male, other } }`.
   - Validate the account belongs to caller; `code` ∈ COUNTRIES, bands ∈ `AGE_BANDS`, gender keys ∈ `GENDERS`; pcts 0–100 (warn if sums far from 100, don't hard-block).
   - Derive `audienceTopCountry = topCountries[0]?.code`. Store Json breakdowns. Set `audienceSource='self_declared'`, `audienceVerified=false`, `audienceVerifiedAt=null` (edit resets verification).
2. **`admin.verifyAudience` / `unverifyAudience`** (adminProcedure, `{ socialAccountId }`): set/clear `audienceVerified` + `audienceSource='admin'`/`'self_declared'` + `audienceVerifiedAt`.
3. **`admin.getCreatorByUsername`**: add `audienceVerified` + `audienceTopCountry` to its select (display state).

> Note: these `socialAccount.update`s trigger the recompute extension — harmless (recomputes to identical follower/engagement values).

## Acceptance
- Creator sets per-account audience; `audienceTopCountry` derived; editing resets verification.
- Admin flips "Audiencia verificada"; non-admin/non-owner blocked.

## Test plan
- Unit: ownership guard; `audienceTopCountry` derivation; verification reset on edit; admin gate.

## Human review
- [ ] Approve pct validation = warn-not-block.
- [ ] Confirm edit-resets-verification (consistent with metrics).
