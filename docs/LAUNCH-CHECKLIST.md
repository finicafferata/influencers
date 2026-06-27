# CreatorLink — Launch Checklist (v1)

*Goal: ship the narrowed v1 loop (publish → search → contact → notify → accept, plus media-kit) and measure whether it works. AI match and audience data are built but flagged OFF.*

Owner: ___ · Target date: ___ · Last updated: 2026-06-26

---

## 0. Pre-flight — code is secured

- [x] All product work committed (no untracked WIP) and pushed to origin.
- [x] CI `Build (typecheck)` + `E2E (boot + core loop)` are **required** on `main`.
- [ ] `chore/secure-mvp-snapshot` merged to `main` via PR (CI green).
- [ ] Tag the launch commit (`git tag v1.0.0 && git push --tags`).

## 1. Feature flags — confirm v1 surface

Set on BOTH the API (Railway) and web (Vercel). Defaults are already v1-correct; set explicitly so prod is unambiguous.

- [ ] `FEATURE_AI_MATCH=off` · `NEXT_PUBLIC_FEATURE_AI_MATCH=off`
- [ ] `FEATURE_AUDIENCE_DATA=off` · `NEXT_PUBLIC_FEATURE_AUDIENCE_DATA=off`
- [ ] `FEATURE_MEDIA_KIT=on` · `NEXT_PUBLIC_FEATURE_MEDIA_KIT=on`
- [ ] Verify in prod: no "Buscar con IA" nav link; `/match` redirects to `/search`; no "Audiencia en…" filter; no AudienceEditor in profile; no "Audiencia" card on public profiles.

## 2. Environment & secrets (prod)

- [ ] `DATABASE_URL` → managed Postgres (not the dev container).
- [ ] `JWT_SECRET` → freshly generated, NOT the dev value (`MVP-PUNCHLIST` §4.4).
- [ ] `API_URL` / `WEB_URL` / `APP_URL` / `NEXT_PUBLIC_API_URL` → real prod origins.
- [ ] API CORS locked to the real web origin with credentials (`MVP-PUNCHLIST` §4.5).
- [ ] Email provider key set (`RESEND_API_KEY`) so magic links actually send (dev logs them; prod must deliver).
- [ ] `NODE_ENV=production` on the API.
- [ ] (Optional, AI match only) `LLM_API_KEY` — leave unset for v1.

## 3. Database

- [ ] `prisma migrate deploy` run against prod (migrations `0001`–`0006`).
- [ ] At least one admin user exists (`isAdmin = true`).
- [ ] Seed real cold-start creators via **Admin → Creadores → Carga masiva** (idempotent; see §5).

## 4. Smoke test in prod (the heartbeat, by hand)

- [ ] Request a magic link as a brand → email arrives → sign in → land on `/dashboard` with search.
- [ ] `/search`: filters return seeded creators; empty-state renders for a no-match filter.
- [ ] Open a creator card → send a structured contact (message + optional brief).
- [ ] Sign in as that creator → notification bell shows unread → inbox shows the request → **accept**.
- [ ] Brand receives the "aceptada" notification.
- [ ] Open a public profile `/c/<username>` → renders, share link + OG image present (media-kit).

## 5. Operations tooling (built, verify it works)

- [ ] **Bulk-seed:** Admin → Creadores → *Carga masiva* — paste the sample JSON, confirm per-row created/skipped/error summary. Re-run the same batch → all `skipped` (idempotent).
- [ ] **Funnel:** Admin → *Funnel* — after the smoke test, confirm `published / searched / contacted / responded` counts and the two conversion rates render.

## 6. Validation metrics (what "it worked" means)

Watch the Admin → Funnel tab (or query `AnalyticsEvent`) over the first weeks:

- **Supply:** `profile_published` count growing.
- **Activation:** `search_performed` per brand.
- **Core conversion:** `search → contact` rate (are searches leading to outreach?).
- **Loop closure:** `contact → response` rate (are creators responding?).

> The funnel is the launch's purpose. If search→contact or contact→response is near zero, the loop is broken regardless of traffic — fix that before scaling acquisition.

## 7. Known limitations (accept for v1, don't fix at launch)

- Rate limiting is in-memory (single-instance). Move to Redis before scaling the API horizontally (`MVP-PUNCHLIST` §4.2, `trpc.ts` note).
- `pnpm lint` has pre-existing API test-file failures; CI `lint` job is `continue-on-error` (`MVP-PUNCHLIST` §2.8).
- Avatar/portfolio media are URL-only (no upload).
- Slice-2 (favorites, lists, agency roster, mobile) intentionally not built — see open `slice-2` issues.

## 8. Rollback

- [ ] If a release is bad: revert the merge commit on `main` and redeploy (Vercel + Railway redeploy from `main`).
- [ ] Feature kill-switch: flip any `FEATURE_*` to off and redeploy — no code change needed.
