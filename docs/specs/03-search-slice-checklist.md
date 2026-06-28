# CreatorLink — Step 3: Implementation Checklist
## Vertical Slice 1 — Creator Discovery & Search (E1–E7)

*Step 3 of the product workflow · Date: 2026-06-07 · Status: Draft for human review*

---

## How to use this checklist

Every item maps back to a numbered point in **Step 2** (`02-search-slice-implementation.md`), shown as `[§x.y]`. This is the **product-level** definition of done — what must be true for the slice to ship — not a code diff. Step 4 will check the codebase against it; Step 6 turns each block into an epic/issue.

**Final decisions applied:** keep `maxFollowers` denormalization · rates **fully public** (incl. logged-out) · niche taxonomy as **code constant** · **no `verifiedOnly` search filter** in this slice (badge still displays).

Legend: `[ ]` to do · each block ends with **Acceptance** (the demoable outcome).

---

## Block 1 — Auth foundation `[§2]` 🔴 blocks everything

- [ ] tRPC context reads the `session` httpOnly cookie (fallback `Authorization: Bearer`) `[§2.1]`
- [ ] JWT verified with `JWT_SECRET`; `ctx.userId = payload.sub` on success, `undefined` on failure `[§2.1]`
- [ ] Single shared `verifyJwt()` helper used by both passport strategy and tRPC context `[§2.2]`
- [ ] Web → API requests forward credentials so the cookie reaches the NestJS tRPC endpoint `[§2.3]`
- [ ] `me.bootstrap` returns resolved role (creator / org_member / admin) derived from relations `[§2.4]`
- [ ] `creatorProcedure` middleware — asserts caller owns a creator profile, else `FORBIDDEN` `[§2.5]`
- [ ] `orgProcedure` middleware — asserts caller has org membership + required capability, else `FORBIDDEN` `[§2.5]`
- [ ] `adminProcedure` middleware — asserts `isAdmin` `[§9.1]`

**Acceptance:** a logged-in user hits a `protectedProcedure` and is authorized; an anonymous request is rejected; role middlewares gate correctly.

---

## Block 2 — Schema deltas `[§3]` 🔴

- [ ] Migration adds `CreatorProfile.published` (default false) `[§3.1]`
- [ ] `CreatorProfile.tags String[]` (default []) `[§3.2]`
- [ ] `CreatorProfile.headline String?` `[§3.3]`
- [ ] `CreatorProfile.maxFollowers Int` (default 0) `[§3.4]`
- [ ] `SocialAccount.verified` (default false), `verificationSource String?`, `verifiedAt DateTime?` `[§3.5]`
- [ ] Indexes: GIN on `niches` + `tags`; btree on `country`, `contentType`, `maxFollowers`, `published` `[§3.6]`
- [ ] Niche controlled vocabulary as a shared constant `{ slug, labelEs }[]` (no DB table) `[§3.7]`
- [ ] Confirm `Contact` + `Notification` unchanged (already sufficient) `[§3.8]`

**Acceptance:** migration applies cleanly; Prisma client regenerated; seed runs against new fields.

---

## Block 3 — Core routers: me / creator / org `[§4.1–4.3]`

### `creator` router
- [ ] `creator.getMine` returns draft/published profile `[§4.2.1]`
- [ ] `creator.upsertProfile` — Zod-validated; username slug + unique; niches ⊆ controlled vocab; tags capped `[§4.2.2]`
- [ ] `creator.addSocialAccount` / `updateSocialAccount` / `removeSocialAccount`; followers ≥0, engagement 0–100 `[§4.2.3]`
- [ ] Social-account writes **recompute `maxFollowers`** and set `self_reported` / `verified=false` `[§4.2.3]`
- [ ] `creator.publish` enforces completeness gate (username + ≥1 social + ≥1 niche + contentType) `[§4.2.4]`
- [ ] `creator.unpublish` `[§4.2.5]`
- [ ] `creator.getByUsername` (public) returns only if published or owner `[§4.2.6]`

### `org` router
- [ ] `org.create` builds capabilities from displayType, creates org + owner membership `[§4.3.1]`
- [ ] `org.getMine` returns orgs + capabilities `[§4.3.2]`

### `me` router
- [ ] `me.bootstrap` wired (also in Block 1) `[§4.1.1]`

**Acceptance:** a creator can create → edit → publish a profile via the API; an org can be created with correct capabilities.

---

## Block 4 — Onboarding & profile UI `[§6.1–6.5]`

- [ ] `/onboarding/role` — creator vs org cards; routes on `isNewUser`/`me.bootstrap` `[§6.1]`
- [ ] `/onboarding/creator` — 4-step wizard (básicos · redes+métricas · nichos+tipo+tags · portfolio/bio/rates); draft saves; final publishes `[§6.2]`
- [ ] `/dashboard/profile` — edit mode + publish/unpublish toggle `[§6.3]`
- [ ] `/c/[username]` — public profile: header, **Verificado** badge when verified, métricas, niches/tags, **rates (public to all)**, portfolio, collaborations `[§6.4]`
- [ ] Public profile shows **"Contactar"** only to org viewers with `can_search_creators` `[§6.4]`
- [ ] `/onboarding/org` — name, displayType, capabilities preview, country → `org.create` `[§6.5]`
- [ ] Shared UI primitives (card, chip, input, modal, badge) in `packages/ui` with Storybook stories `[§6]`

**Acceptance:** a new user picks a role, completes onboarding, and lands on a shareable public profile; an org completes its onboarding.

---

## Block 5 — Search router + query `[§4.4, §5]`

- [ ] `search.creators` (orgProcedure, requires `can_search_creators`) accepts: niches, country, city, contentType, platform+followersMin/Max+engagementMin/Max, tags, q, sort, cursor, limit `[§4.4.1]`
- [ ] **No `verifiedOnly` input** in this slice (decision 5) `[§5]`
- [ ] Where-builder omits undefined keys; niches/tags via `hasSome`; social filters via `socialAccounts.some` `[§5.1]`
- [ ] Reach filtering on relation, **sorting on denormalized `maxFollowers`** `[§5.2]`
- [ ] Cursor pagination; limit ≤ 50; always `published: true` `[§5.3]`
- [ ] Structured empty-result payload for the UI `[§5.4]`
- [ ] All filterable columns indexed; text search safe (trgm/GIN if `q` enabled) `[§5.5]`
- [ ] Returns card payload subset only (no full bio dump) `[§4.4.1]`

**Acceptance:** an org filters by niche/country/platform/reach and gets paginated, published-only results sorted correctly, with a clean empty state.

---

## Block 6 — Search & creator-card UI `[§6.6]`

- [ ] `/search` — sidebar filters: nichos (controlled chips), país, plataforma, rango seguidores, engagement, tags, texto libre `[§6.6]`
- [ ] Results grid of creator cards (avatar, headline, país, niches, reach, verified badge) `[§6.6]`
- [ ] Card → **creator card view (E6)** drawer/modal reusing public-profile payload + org actions `[§6.6]`
- [ ] "Contactar" + "Contactado" state on the card `[§6.6]`
- [ ] Empty + loading states; mobile-first layout `[§5.4, §6]`

**Acceptance:** an org runs a search and opens a full creator card ready to contact.

---

## Block 7 — Contact + notifications (closes the loop) `[§4.5–4.6, §6.7–6.9]`

- [ ] `contact.send` (orgProcedure) creates `Contact{pending}` + `Notification` for creator `[§4.5.1]`
- [ ] `contact.listForCreator` (inbox) `[§4.5.2]`
- [ ] `contact.updateStatus` (pending→accepted/declined) `[§4.5.3]`
- [ ] `contact.listSentByOrg` (dedupe / "Contactado") `[§4.5.4]`
- [ ] `notification.list` / `markRead` / `markAllRead` / `unreadCount` `[§4.6]`
- [ ] Contact modal (brief + message) from card → `contact.send` + success toast `[§6.7]`
- [ ] `/dashboard/contacts` — creator inbox with brief, sender org, accept/decline `[§6.8]`
- [ ] Notification bell in header with unread badge `[§6.9]`

**Acceptance:** org sends a contact with a brief → creator gets an in-app notification → creator opens inbox and accepts/declines. **Loop has a heartbeat.**

---

## Block 8 — Admin seed + verify `[§8.2, §9]`

- [ ] `admin.createCreatorProfile` (hand-seed inventory) `[§9.1]`
- [ ] `admin.listUsers`, `admin.suspendUser`, `admin.listContacts` `[§9.1]`
- [ ] `admin.verifySocialAccount` flips `verified=true`, `verificationSource='admin'`, `verifiedAt=now` `[§8.2]`
- [ ] Minimal `/admin` screen to seed + verify creators `[§9.2]`

**Acceptance:** admin can seed creators before launch and grant the **Verificado** badge.

---

## i18n `[§7]`

- [ ] Default locale `es`; copy authored in Spanish (LATAM-neutral) `[§7.1]`
- [ ] Strings in a dictionary structure (English addable later; only `es` ships) `[§7.1]`
- [ ] Niche `labelEs` rendered; slugs stable for filtering `[§7.2]`
- [ ] Currency/number formatting via `Intl` with locale `[§7.3]`

---

## Verification & testing (Step 9 will execute manually; targets here)

- [ ] **Unit:** where-clause builder maps every filter correctly (incl. omit-undefined, reach `some`, niche `hasSome`)
- [ ] **Unit:** completeness gate blocks publish when requirements unmet; `maxFollowers` recompute correct
- [ ] **Unit:** role middlewares (`creator`/`org`/`admin`) authorize and reject correctly
- [ ] **Integration:** auth context resolves `userId` from cookie; anonymous rejected
- [ ] **Integration:** `contact.send` creates both Contact + Notification atomically
- [ ] **E2E (happy path):** seed creator → org search finds them → open card → send contact → creator sees notification + inbox → accept
- [ ] **E2E (gates):** non-org user blocked from search/contact; unpublished profile absent from results; 404 on unpublished `/c/[username]`
- [ ] **Manual:** Spanish copy review; mobile layout on the 5 core screens; empty/no-results states

---

## Definition of Done for Slice 1

> A hand-seeded, published creator is **discoverable** by an org through filters, the org can **open the card and send a contact with a brief**, and the **creator is notified and can respond** — end-to-end on the real tRPC + Prisma stack, Spanish-first and mobile-first, with the auth context properly resolving identity.

> Next: **Step 4 — code review** of the current repo against Blocks 1–8 to confirm what exists, what needs modifying, and what's missing.
