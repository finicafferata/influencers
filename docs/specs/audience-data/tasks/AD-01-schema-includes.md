# AD-01 — Schema + constants + include extensions

*Backend · Depends on: none · The shared spine*

## Objective
Add the per-account audience fields, the age/gender constants, and extend the two shared includes that unlock scoring, cards, editor, and kit.

## Requirements
1. **Schema** (`SocialAccount`, additive):
   - `audienceTopCountry String?` (queryable), `audienceCountries Json?`, `audienceAges Json?`, `audienceGender Json?`.
   - `audienceVerified Boolean @default(false)`, `audienceSource String?`, `audienceVerifiedAt DateTime?`.
   - `@@index([audienceTopCountry])`. Migration additive (defaults backfill).
2. **Constants** (`packages/trpc/src/constants.ts`): `AGE_BANDS = ['13-17','18-24','25-34','35-44','45+']`, `GENDERS = ['female','male','other']` (+ sets).
3. **`CREATOR_CARD_INCLUDE`** (`retrieval.ts`): add `audienceTopCountry` to the `socialAccounts` select (needed for match scoring; also lets cards show it).
4. **`CardPayload.topAccounts`** + `toCardPayload`: pass `audienceTopCountry` through (optional display).
5. **`PUBLIC_PROFILE_INCLUDE`** (`creator.ts`): add the audience fields (`audienceTopCountry`, `audienceCountries`, `audienceAges`, `audienceGender`, `audienceVerified`, `audienceSource`) to the `socialAccounts` select — one edit unlocks editor + kit + getByUsername.
6. **`CreatorFilter`** (`retrieval.ts`): add `audienceCountry?: string`.

## Acceptance
- Migration applies on clean + seeded DB; existing accounts load (audience fields null/false).
- Both includes expose audience fields; `search.creators` + `getMine`/`getByUsername` payloads carry them with no other change.

## Human review
- [ ] Approve the 7 fields + index.
- [ ] Approve AGE_BANDS / GENDERS sets.
