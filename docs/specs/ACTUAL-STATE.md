# CreatorLink — Actual State (reconciled)

*Date: 2026-06-26 · Reconciles shipped code against the GitHub issue board (#1–31).*
*Source of truth: the code on branch `chore/secure-mvp-snapshot` (commit `63035e8`), now on origin.*

> Why this exists: the entire product beyond Google OAuth shipped as uncommitted work,
> and three roadmap phases were built with **no GitHub issues**. The board was stale fiction.
> This page is the single map of what is actually built, partially built, or not built.

---

## TL;DR

- **Built and in code:** the full Slice-1 core loop (publish → search → contact → notify → accept),
  plus three roadmap phases that shipped silently: **media-kit, AI brief-to-match, audience data**.
- **Not built:** talent-agency roster/team-invites, favorites/lists, mobile app. (Slice-2 backlog.)
- **Unverified / risk:** critical-path code (matchScore, search where-builder, admin authZ,
  public-route leakage, LLM injection) is reviewed in Phase 2 — see `MVP-PUNCHLIST.md` §3–4.

---

## 1. Built — Slice 1 core loop (maps to existing issues → CLOSE)

| Issue | Feature | Evidence (file:line) |
|-------|---------|----------------------|
| #7  | Role selection on first login | `apps/web/src/app/onboarding/role/page.tsx`; routing via `me.bootstrap` `packages/trpc/src/routers/me.ts:10` |
| #8–#11 | Creator onboarding steps 1–4 (basic/social/niches/portfolio) | `apps/web/src/app/onboarding/creator/page.tsx` (autosave wizard); `creator.upsertProfile` `routers/creator.ts:82`, `addSocialAccount` `:121` |
| #12 | Creator public profile page | `apps/web/src/app/c/[username]/page.tsx` (SSR); `creator.getByUsername` `routers/creator.ts:197` (publicProcedure) |
| #13 | Rates & previous collaborations | public rates in `getByUsername`; portfolio/work-samples `creator.addPortfolioItem` `routers/creator.ts:214` |
| #14 | Organization onboarding | `apps/web/src/app/onboarding/org/page.tsx`; `org.create` `routers/org.ts:17` |
| #17 | Creator search with filters | `apps/web/src/app/search/page.tsx`; `search.creators` `routers/search.ts:40` (`orgProcedure('can_search_creators')`) |
| #18 | Creator cards in search results | `apps/web/src/components/CreatorCard.tsx`, `CreatorFilters.tsx` |
| #19 | Creator full profile view (agency) | creator-card drawer in `search/page.tsx` + `getByUsername` |
| #20 | Agency/brand dashboard | `apps/web/src/app/dashboard/page.tsx`; sent contacts `contact.listSentByOrg` `routers/contact.ts:120` |
| #23 | Contact creator (basic) | `apps/web/src/components/ContactButton.tsx`; `contact.send` `routers/contact.ts:20` (atomic + DB dedupe + rate limit) |
| #24 | Basic admin panel | `apps/web/src/app/admin/page.tsx` (3-tab); `admin.*` `routers/admin.ts:12–171` (all `adminProcedure`) |
| #25 | Public landing page | `apps/web/src/app/page.tsx` (dual CTA) |
| #26 | Creator dashboard (logged-in home) | `apps/web/src/app/dashboard/contacts/page.tsx` (inbox accept/decline); `contact.listForCreator` `routers/contact.ts:76` |
| #30 | In-app notification system | `apps/web/src/components/NotificationBell.tsx`; `notification.*` `routers/notification.ts:5–39` |
| #31 | Creator public profile SEO | `apps/web/src/app/c/[username]/opengraph-image.tsx` |

## 2. Built — roadmap phases with NO issue (→ OPEN new epic issues, then close)

| Phase | Status | Evidence (file:line) | Specs |
|-------|--------|----------------------|-------|
| **Media-kit** | shipped | portfolio CRUD `routers/creator.ts:214–235`; `opengraph-image.tsx`; `components/ShareKit.tsx`; migration `0003_media_kit` | `docs/specs/media-kit/` |
| **AI brief-to-match** | shipped | `match.parseBrief`/`run`/`feedback` `routers/match.ts:79,93,159`; `matchScore.ts`; `llm.ts`; `retrieval.ts`; `app/match/page.tsx`; migration `0004_match_feedback`; `apps/api/src/llm/` | `docs/specs/ai-match/` |
| **Audience data** | shipped | `creator.setAudience` `routers/creator.ts:255`; `admin.verifyAudience` `routers/admin.ts:153`; `components/AudienceEditor.tsx`; migration `0005_audience_data` | `docs/specs/audience-data/` |

## 3. NOT built — keep OPEN (Slice-2 / deferred)

| Issue | Feature | Why open |
|-------|---------|----------|
| #15 | Team management — invite members | No `org.invite*` procedure; org router stops at `create`/`getMine` (`routers/org.ts`) |
| #16 | Talent agency — creator roster | Explicitly deferred — comment `routers/org.ts:10` ("wait for the roster epic") |
| #21 | Creator lists management | No list/saved-search procedures in code |
| #22 | Favorites | No favorites procedure/UI in code |
| #28 | Creator onboarding via agency invite | Depends on #15/#16 (not built) |
| #29 | React Native / Expo shell (apps/mobile) | No `apps/mobile` directory exists |

## 4. Known risks (handled in Phase 2)

Critical-path code is committed but **unreviewed** (`MVP-PUNCHLIST.md` §3–4):
`matchScore` weights/edge-cases, `search` where-builder + injection-safety, admin authZ,
public-route leakage on `/c/:username`, LLM prompt-injection/fallback. Unit-test gaps:
`matchScore`, `buildCreatorWhere`, the aggregate-recompute extension (§5.7).

## 5. Build/CI state

- `pnpm build` passes (typecheck) — `MVP-PUNCHLIST.md` §2.7.
- CI (`.github/workflows/ci.yml`): `build` + `e2e` (e2e `needs: build`) are green gates;
  `lint` is isolated (`continue-on-error`) pending §2.8 test-file lint fixes.
- **Branch protection on `main`** makes `Build (typecheck)` + `E2E (boot + core loop)` required — set in Phase 1.
