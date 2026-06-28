# CreatorLink — Step 2: Detailed Implementation Plan
## Vertical Slice 1 — Creator Discovery & Search (E1–E7)

*Step 2 of the product workflow · Date: 2026-06-07 · Status: Partially superseded by REVIEW-01*

> **⚠️ Superseded points:** REVIEW-01 changed the auth model (Next.js proxy, not API-origin cookie), removed `verifiedOnly` from §4.4, added `maxEngagement` denorm, DB-level contact dedupe, `pg_trgm`, and suspended-in-context. Read this doc alongside `REVIEW-01-independent-review.md`; the TASK-* specs reflect the final decisions.

---

## 0. Decisions locked (from Step 1 review)

| # | Question | Decision |
|---|----------|----------|
| Q1 | Metrics verification | **Phased.** Ship self-reported + admin "Verificado" badge now; architect schema for OAuth/provider later |
| Q2 | Contact channel | **In-app** (notification + contact inbox). No external email thread for MVP |
| Q3 | Seeding | **Hand-seed creators via admin first**, then open org search |
| Q4 | Rates visibility | **Public** on the profile |
| Q5 | Niche taxonomy | **Both** — controlled vocabulary (filters) + free-text tags (nuance) |

This plan is **point-by-point how we build it**. It is not yet a checklist (Step 3) or per-task spec (Step 5). Each point is numbered so Step 3 can turn it into checkable items and Step 6 into issues.

---

## 1. Scope recap

In: **E1** role selection · **E2** creator profile create/edit · **E3** public profile · **E4** org onboarding · **E5** search + filters · **E6** creator card · **E7** structured in-app contact.
Out (fast-follow / backlog): lists, favorites beyond schema, saved searches, roster view, messaging, OAuth verification, reviews, payments.

The build is **~90% tRPC procedures + web screens** — the schema is already designed. The single biggest piece of plumbing is wiring auth into the tRPC context.

---

## 2. Foundation — fix the auth plumbing (blocks everything)

> Without this, `protectedProcedure` can never authorize and no write procedure works. Do this first.

1. **Populate `userId` in the tRPC context.** Today `createContext` in `apps/api/src/trpc/trpc.router.ts` hardcodes `userId: undefined`. Read the `session` httpOnly cookie (or `Authorization: Bearer`), verify the JWT with `JWT_SECRET`, and set `ctx.userId = payload.sub`.
2. **Share JWT verification** between NestJS passport strategy and tRPC context (extract a small `verifyJwt(token)` helper) so there's one source of truth for `sub`/`email`.
3. **Forward the cookie from web → api.** The Next.js tRPC client must send credentials so the `session` cookie reaches the NestJS tRPC endpoint (set `credentials: 'include'` / forward cookie header in the server-side tRPC caller).
4. **Define role resolution.** There is no `role` column on `User`; role is **derived**: has `creatorProfile` ⇒ creator, has `organizationMembership` ⇒ org member, `isAdmin` ⇒ admin. Add a `me.bootstrap` procedure (point 4.1) that returns the resolved role so the frontend can route.
5. **Add an `orgProcedure` / `creatorProcedure` middleware** on top of `protectedProcedure` that asserts the caller has an org membership (with the needed capability) or a creator profile respectively, throwing `FORBIDDEN` otherwise.

---

## 3. Schema deltas (Prisma)

Minimal, additive migrations. No destructive changes.

1. **`CreatorProfile.published Boolean @default(false)`** — search only returns published profiles; editing happens in draft.
2. **`CreatorProfile.tags String[] @default([])`** — free-text tags (Q5). `niches` stays as the controlled set.
3. **`CreatorProfile.headline String?`** — short one-liner for cards/search results.
4. **`CreatorProfile.maxFollowers Int @default(0)`** — denormalized aggregate of social accounts, kept in sync on every social-account write. Lets search **filter and sort by reach without joining/aggregating** a relation per row (Prisma can't sort by a related aggregate cleanly).
5. **`SocialAccount.verified Boolean @default(false)`**, **`verificationSource String?`** (`self_reported | admin | oauth | provider`), **`verifiedAt DateTime?`** — the phased-verification hooks (Q1).
6. **Indexes for search:** GIN index on `CreatorProfile.niches` and `tags` (array overlap), btree on `country`, `contentType`, `maxFollowers`, `published`. (Prisma: `@@index` + raw migration for GIN.)
7. **Niche taxonomy storage.** For MVP keep the **controlled vocabulary as a constant** in a shared package (`packages/trpc` or a new `packages/taxonomy`) — `{ slug, labelEs }[]` — rather than a DB table. Validation rejects niches outside the list. (A DB-backed `Niche` table is deferred; the constant is enough and avoids a join.)
8. `Contact` and `Notification` models already cover E7 — **no change needed** (note: `Contact.campaignBrief` and `status` exist; `Notification.type/title/body/link` exist).

---

## 4. tRPC API surface (the empty layer)

New routers under `packages/trpc/src/routers/`, registered in `root.ts`. All inputs validated with Zod; all mutations on `protectedProcedure`+ role middleware.

### 4.1 `me` router
1. `me.bootstrap` (protected query): returns `{ user, role, creatorProfile?, org? }` for routing/role resolution.

### 4.2 `creator` router (creator-owned)
1. `creator.getMine` (protected query) — current user's draft/published profile.
2. `creator.upsertProfile` (creatorProcedure mutation) — username (unique, slug-validated), country, city, contentType (`ugc|influencer|both`), niches (subset of controlled vocab), tags (free text, capped count/length), headline, bio, rates (Json: `{ platform/deliverable: amount, currency }`).
3. `creator.addSocialAccount` / `updateSocialAccount` / `removeSocialAccount` (creatorProcedure) — platform (enum), handle, followers (int ≥0), engagementRate (float 0–100). On write, **recompute `maxFollowers`** and set `verificationSource='self_reported'`, `verified=false`.
4. `creator.publish` (creatorProcedure) — validates **completeness gate** (username + ≥1 social account + ≥1 niche + contentType) then sets `published=true`.
5. `creator.unpublish` (creatorProcedure).
6. `creator.getByUsername` (public query) — the public profile payload (E3). Returns only if `published` (or if requester owns it).

### 4.3 `org` router (demand side, E4)
1. `org.create` (protected mutation) — name, displayType (`brand|marketing_agency|talent_agency|hybrid`), capabilities derived from displayType (overridable), country, logo, website. Creates `Organization` + `OrganizationMember{role:'owner'}` for the caller.
2. `org.getMine` (protected query) — orgs the user belongs to + capabilities.

### 4.4 `search` router (E5) — the demand anchor
1. `search.creators` (orgProcedure query, requires `can_search_creators`) with input:
   - `niches?: string[]` (overlap / hasSome)
   - `country?: string`, `city?: string`
   - `contentType?: 'ugc'|'influencer'|'both'`
   - `platform?: enum` + `followersMin?/Max?` + `engagementMin?/Max?` → mapped to `socialAccounts: { some: { platform, followers gte/lte, engagementRate gte/lte } }`
   - `tags?: string[]`, `q?: string` (free text over headline/bio/tags/username)
   - `verifiedOnly?: boolean`
   - `sort?: 'followers'|'engagement'|'recent'` (followers sort uses denormalized `maxFollowers`)
   - cursor pagination (`cursor?`, `limit` default 20)
   - **Always filters `published: true`.**
   Returns creator **card payloads** (subset): id, username, headline, avatar, country, niches, contentType, maxFollowers, top social account(s), verified flag.

### 4.5 `contact` router (E7)
1. `contact.send` (orgProcedure mutation, requires `can_search_creators`) — input `{ toCreatorId, message, campaignBrief? }`; sets `orgName` from caller's org; creates `Contact{status:'pending'}` **and** a `Notification` for the creator's user (`type:'contact'`, link to inbox).
2. `contact.listForCreator` (creatorProcedure query) — the creator's received contacts (inbox).
3. `contact.updateStatus` (creatorProcedure mutation) — `pending → accepted | declined`.
4. `contact.listSentByOrg` (orgProcedure query) — what the org has already sent (prevents dupes; show "Contactado").

### 4.6 `notification` router (in-app, supports E7)
1. `notification.list` (protected query) — paginated, unread-first.
2. `notification.markRead` / `markAllRead` (protected mutations).
3. `notification.unreadCount` (protected query) — for the badge.

---

## 5. Search query design (the hard part of E5)

1. **Where-clause builder**: compose a Prisma `where` from the filter input; omit undefined keys. Controlled niches/tags use `hasSome`; social filters use the `socialAccounts.some` relation filter.
2. **Reach filter/sort**: filter on the related `socialAccounts.some.followers` for "has an account with ≥ X", **but sort by the denormalized `CreatorProfile.maxFollowers`** to avoid per-row aggregation. Keep `maxFollowers` correct via the recompute in 4.2.3.
3. **Pagination**: cursor on `(createdAt, id)` for `recent`; on `(maxFollowers, id)` for followers sort. Limit ≤ 50.
4. **Empty/zero-result states** are a product requirement, not an afterthought — return a structured empty result so the UI can show "ajustá los filtros".
5. **Performance guardrail**: every filterable column indexed (point 3.6); cap result page size; no `OR` text search without a trigram/GIN index if `q` is enabled (add `pg_trgm` index on headline/bio if needed).

---

## 6. Web screens (Next.js 15, mobile-first, Spanish-first)

Routes and the order to build them:

1. **`/onboarding/role` (E1)** — after verify, if `isNewUser` (already returned by the verify route) or `me.bootstrap` shows no role, show two big cards: *"Soy creador"* / *"Soy marca o agencia"*. Selection routes to creator or org onboarding.
2. **`/onboarding/creator` (E2)** — 4-step wizard mirroring the design doc: (1) básicos: username, país, ciudad; (2) redes + métricas: add social accounts; (3) nichos + tipo de contenido + tags; (4) portfolio/bio + rates. Saves drafts via `creator.upsertProfile`; final step calls `creator.publish`.
3. **`/dashboard/profile` (E2 edit)** — same form, edit mode; publish/unpublish toggle.
4. **`/c/[username]` (E3)** — public profile: header (avatar, username, headline, país, **Verificado** badge), métricas per platform, niches/tags, rates (public, Q4), portfolio, collaborations. Org viewers see a **"Contactar"** button (gated by `can_search_creators`).
5. **`/onboarding/org` (E4)** — org name, displayType selector (brand/agency/talent/hybrid), capabilities preview, country. Calls `org.create`.
6. **`/search` (E5 + E6)** — sidebar filters (nichos as controlled chips, país, plataforma, rango de seguidores, engagement, solo verificados, tags, texto libre) + results grid of **creator cards**. Card → opens **creator card view (E6)** (drawer/modal reusing the public-profile payload + org-only actions: Contactar, estado "Contactado").
7. **Contact modal (E7)** — from the card: campaign brief + message → `contact.send`. Success toast.
8. **`/dashboard/contacts` (E7, creator side)** — inbox of received contacts with brief, sender org, accept/decline (`contact.updateStatus`).
9. **Notification bell** (E7 support) — header dropdown using `notification.*`, unread badge.

UI primitives (cards, chips, inputs, modal, badge) go in `packages/ui` with Storybook stories so both onboarding and search reuse them.

---

## 7. i18n — Spanish-first

1. **Default locale `es`**, copy authored in Spanish (LATAM-neutral). Structure strings in a dictionary (e.g. `next-intl` or a simple `messages/es.json`) so English can be added later without refactoring — but **only `es` ships in the slice.**
2. **Taxonomy labels in Spanish** (`labelEs` on the controlled niche constant); slugs stay English for stable filtering.
3. Currency/number formatting via `Intl` with locale; rates display with currency from the rate Json.

---

## 8. Verification — phased implementation (Q1)

1. **Now (this slice):** every social account is `verified=false`, `verificationSource='self_reported'`. Profiles are fully usable; cards show no badge.
2. **Admin verification path (this slice, light):** creator can request verification (optional screenshot URL field); an **admin** procedure `admin.verifySocialAccount` flips `verified=true`, `verificationSource='admin'`, `verifiedAt=now`. Card + profile then show **"Verificado"**. This is the credibility lever for brands without heavy integration.
3. **Later (backlog, schema-ready):** `oauth` (Instagram Graph / TikTok / YouTube) and `provider` (Phyllo/Modash) just set a different `verificationSource` — **no schema change required**. `search.creators.verifiedOnly` already filters on the flag.

---

## 9. Admin (supports Q3 seeding, minimal)

1. `admin.*` procedures (adminProcedure middleware on `isAdmin`): `createCreatorProfile` (hand-seed), `listUsers`, `suspendUser`, `verifySocialAccount`, `listContacts`.
2. A minimal `/admin` screen to seed and verify creators before org search opens. Just enough to populate inventory.

---

## 10. Build order (dependency-aware)

| Order | Block | Depends on |
|-------|-------|-----------|
| 1 | §2 Auth context fix + `orgProcedure`/`creatorProcedure` | — |
| 2 | §3 Schema deltas + migration | — |
| 3 | §4.1–4.3 `me` / `creator` / `org` routers | 1, 2 |
| 4 | §6.1–6.5 role selection, creator onboarding, public profile, org onboarding | 3 |
| 5 | §4.4 + §5 search router + query builder | 2, 3 |
| 6 | §6.6 search + creator card UI | 4, 5 |
| 7 | §4.5–4.6 + §6.7–6.9 contact + notifications (closes loop) | 5, 6 |
| 8 | §8.2 + §9 admin verify + seed | 3 |

When blocks 1→7 are green, the **two-sided loop has a heartbeat** and is demoable end to end.

---

## 11. Risks & call-outs for human review

1. **Auth context is a real gap, not a tweak** — the tRPC layer is currently unauthenticated by construction. Block 1 is non-negotiable and should be reviewed carefully (cookie forwarding across the web→api boundary is the fiddly part).
2. **Sort-by-reach** forced the `maxFollowers` denormalization. Alternative is raw SQL aggregation; denormalization is simpler and indexed but must stay in sync (single write path in 4.2.3).
3. **Rates are public (Q4)** — confirm we're comfortable exposing rate cards on unauthenticated public profile pages (`/c/[username]`), or whether rates should render only to logged-in org viewers even though the profile is public.
4. **Niche taxonomy as a code constant** means adding a niche is a deploy. Acceptable for MVP; flag if marketing needs to edit niches without engineering.
5. **`verifiedOnly` filter with little verified inventory** early on will return few results — sequence admin verification (block 8) alongside seeding.

> Next: **Step 3 — product-level implementation checklist** derived from these numbered points, then **Step 4 — code review** to confirm what's already in place against this plan.
