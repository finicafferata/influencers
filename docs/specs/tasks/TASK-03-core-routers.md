# TASK-03 — Core Routers: me / creator / org

*High priority · Depends on: TASK-01 (middlewares), TASK-02 (fields, taxonomy)*

## Objective
Build the supply- and demand-side write/read APIs: creator profile lifecycle, org creation, and the `me` bootstrap. This makes profiles publishable and orgs creatable through the real stack.

## Decisions made (best-practice)
- **Username** is immutable after first set (stable public URLs / SEO); validated as lowercase slug `[a-z0-9_]{3,30}`, globally unique.
- **Capabilities derived from `displayType`** at org creation, with sane defaults (brand/marketing → `can_search_creators`; talent → `can_represent_creators`; hybrid → both); overridable by an explicit `capabilities` arg.
- **Publish is gated** by a completeness check; partial profiles save as drafts freely.
- **`maxFollowers` recomputed** on every social-account mutation — the single sync path for TASK-02's denormalized field.
- **Rates stored as structured Json** `{ [deliverable]: { from: number; currency: string } }`; currency defaults to `USD` but is per-entry (LATAM multi-currency ready).

## Scope
**In:** `creator.*`, `org.*`, `me.bootstrap` (shared with TASK-01). Zod validation throughout.
**Out:** search (TASK-05), contact/notifications (TASK-07), admin (TASK-08), UI (TASK-04).

## Requirements — `creator` router
1. `getMine` (creatorProcedure query) → full own profile incl. drafts.
2. `upsertProfile` (protectedProcedure mutation — creates profile on first call, so can't require it to pre-exist): validates username (immutable once set), country, city, contentType ∈ {ugc,influencer,both}, niches ⊆ `NICHE_SLUGS`, tags (normalized, ≤10), headline (≤80), bio (≤1000), rates Json shape.
3. `addSocialAccount` / `updateSocialAccount` / `removeSocialAccount` (creatorProcedure): platform ∈ `PLATFORMS` (unique per creator), handle, followers (int ≥0), engagementRate (0–100, optional). **Recompute `maxFollowers`** after each. New/updated accounts → `verified:false`, `verificationSource:'self_reported'`.
4. `publish` (creatorProcedure): assert completeness (username ∧ ≥1 social ∧ ≥1 niche ∧ contentType) → `published:true`; else `BAD_REQUEST` listing missing fields.
5. `unpublish` (creatorProcedure) → `published:false`.
6. `getByUsername` (publicProcedure query): returns public payload only if `published` OR requester is owner; else `NOT_FOUND`.

## Requirements — `org` router
1. `create` (protectedProcedure mutation): name, displayType ∈ {brand,marketing_agency,talent_agency,hybrid}, optional capabilities override, country, logo, website. Creates `Organization` + `OrganizationMember{role:'owner'}`. A user may own multiple orgs.
2. `getMine` (protectedProcedure query) → orgs + capabilities + the caller's role.

## Contracts (selected)
```ts
creator.upsertProfile(input: {
  username: string; country?: string; city?: string;
  contentType?: 'ugc'|'influencer'|'both';
  niches?: string[]; tags?: string[]; headline?: string; bio?: string;
  rates?: Record<string, { from: number; currency?: string }>;
}): CreatorProfile

creator.getByUsername({ username }): PublicProfile  // header, metrics, niches/tags, rates (public), portfolio, collaborations, verified flags

org.create(input: {
  name: string; displayType: 'brand'|'marketing_agency'|'talent_agency'|'hybrid';
  capabilities?: string[]; country?: string; logo?: string; website?: string;
}): { org; membership }
```

## Acceptance criteria
- Creator can create → edit → add socials → publish, with the completeness gate blocking incomplete publishes and `maxFollowers` always equal to the max social follower count.
- Public profile resolves by username only when published.
- Org creation yields correct capabilities for each displayType and an owner membership.

## Test plan
- Unit: username validation/immutability; completeness gate (each missing field); `maxFollowers` recompute on add/update/remove; capability derivation per displayType; rates shape validation.
- Integration: full creator publish flow; `getByUsername` published vs draft vs owner.

## Human review
- [ ] Approve username immutability (vs editable with redirect).
- [ ] Approve capability defaults per displayType.
- [ ] Approve rates Json shape + per-entry currency.
- [ ] Confirm completeness gate fields.
