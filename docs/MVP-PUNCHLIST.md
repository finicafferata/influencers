# CreatorLink — MVP Punch-List & E2E Hardening Plan

A prioritized backlog to get CreatorLink launch-ready, plus a plan to verify
everything end-to-end. Structured so each item can be dropped into
[GitHub Spec Kit](https://github.com/github/spec-kit) (`/speckit.specify` →
`/speckit.plan` → `/speckit.tasks` → `/speckit.implement`).

> Status legend: ✅ done in this session · 🔴 blocker · 🟠 important · 🟡 nice-to-have · ❓ needs review
> Scope note: This list is based on a partial read (auth + match slice + the running UI). Items marked ❓ were **not** reviewed and need a pass before trusting them.

---

## 1. Bugs already fixed this session (verify they're committed)

| # | Item | Description |
|---|------|-------------|
| 1.1 ✅ | tRPC route wildcard | `/trpc*` is invalid under Express 5 / path-to-regexp v8. Changed to `/trpc{/*path}` in `apps/api/src/app.module.ts`. |
| 1.2 ✅ | Google OAuth crash | `GoogleStrategy` threw at boot without creds, contradicting "magic-link works without OAuth". Now registered only when `GOOGLE_CLIENT_ID/SECRET` are present (`apps/api/src/auth/auth.module.ts`). |
| 1.3 ✅ | `match.ts` type error | `pool()` helper lost Prisma's `include` inference; `toCardPayload(c)` failed typecheck. Pass `where` directly + import `Prisma` (`packages/trpc/src/routers/match.ts`). |
| 1.4 ✅ | Node 24 can't load raw-TS packages | `@repo/db`/`@repo/trpc` ship raw `src/*.ts`; extensionless imports break Node's native loader. API `dev` now registers `tsx` (`--import tsx`); `tsx` added at root. |
| 1.5 ✅ | esbuild binary mislinked | `esbuild@0.25.12` missing its native binary symlink (broke seed + tsx). Relinked in `node_modules` (not durable — see 2.3). |
| 1.6 ✅ | Dark-mode CSS leak | `create-next-app` `prefers-color-scheme: dark` block made the light-themed UI unreadable. Removed from `apps/web/src/app/globals.css`. |
| 1.7 ✅ | Port clash | API moved to `:3002` (`:3001` taken by another local project). Updated `apps/api/.env` + `apps/web/.env.local`. |

---

## 2. Build, tooling & repo hygiene (do first — unblocks everyone)

| # | Item | Description |
|---|------|-------------|
| 2.1 🔴 | E2E boot CI | Add CI: `install → db:generate → migrate:deploy → seed → build → boot API → POST /auth/magic-link`. Every bug above would have been caught here. |
| 2.2 🟠 | Decide TS-package strategy | Either give `@repo/db`/`@repo/trpc` a real build step (`tsup`) and point `main` at `dist`, **or** commit intentionally to the tsx-loader path. Today it works by accident on Node 24. |
| 2.3 🟠 | Reproducible esbuild/install | The esbuild symlink fix won't survive a clean `pnpm install`. Pin versions / dedupe so a fresh clone installs cleanly. Document required Node version (pin to one, e.g. via `.nvmrc` / `engines`). |
| 2.4 🟠 | No committed WIP | `match.ts` was untracked + broken; `db/index.ts` had uncommitted changes. Add a pre-push/CI typecheck gate (`turbo build` / `tsc --noEmit`). |
| 2.5 🟡 | Cross-platform dev script | `NODE_OPTIONS='--import tsx'` inline env in `package.json` is shell-specific. Use `cross-env` if Windows devs are expected. |
| 2.6 🟡 | LOCAL-DEV accuracy | Update docs to match reality (port 3002 fallback, Node version, tsx requirement, OAuth truly optional). |
| 2.7 ✅ | ~~`next build` is broken~~ | FIXED: (a) ESLint flat-config rewritten with `FlatCompat` (eslint-config-next ships legacy eslintrc presets); (b) recursive `Prisma.JsonValue` in the creator profile output tipped tRPC inference into "excessively deep" — added a `serializeProfile` helper casting JSON columns to concrete types (`rates`, audience fields) across `getMine`/`getByUsername`/`upsertProfile`; (c) `search/page.tsx` `CardItem` drifted from `CardPayload` — aliased to the canonical type. `pnpm build` now passes 2/2; e2e re-coupled to `needs: build`. |
| 2.8 🟠 | `pnpm lint` fails (API tests) | Pre-existing typed-lint failures in the API **test files**: `no-unsafe-assignment`/`no-unsafe-member-access` on spec mocks, an unused `_next`, and `test/app.e2e-spec.ts` not included in the lint tsconfig (parsing error). Not in product code. Fix by adding test files to the lint tsconfig project + a test-file override (relax `no-unsafe-*` for specs). CI `lint` job is isolated (`continue-on-error`) until then. |

---

## 3. Correctness review of code NOT yet read (substance risk lives here)

| # | Item | Description |
|---|------|-------------|
| 3.1 ❓🟠 | `matchScore` algorithm | The actual ranking/scoring math (`packages/trpc/src/matchScore.ts`) was never read. Review weights, normalization, edge cases (zero followers/engagement, missing audience data). |
| 3.2 ❓🟠 | Search router | `packages/trpc/src/routers/search.ts` — filter correctness, pagination, injection-safe `contains` queries, performance on the candidate cap. |
| 3.3 ❓🟠 | Admin router | Verify/suspend/seed flows — authorization checks (admin-only), audit of destructive actions. |
| 3.4 ❓🟠 | Media kit & share | Public profile (`/c/:username`), OG/QR unfurl, work samples — ensure no auth leakage on public routes. |
| 3.5 ❓🟠 | LLM brief parsing | `apps/api/src/llm/` — prompt injection, timeout/fallback to heuristic, cost guardrails, error handling when key is set but provider fails. |
| 3.6 ❓🟡 | Audience data | Declaration + filtering ("Audiencia en…") consistency between search and match. |

---

## 4. Security & auth (must-pass before launch)

| # | Item | Description |
|---|------|-------------|
| 4.1 🔴 | AuthZ on every procedure | Confirm `orgProcedure` / role guards are applied consistently (brand-only search, creator-only inbox, admin-only admin). Spot a missing guard = data leak. |
| 4.2 🟠 | Magic-link hardening | Single-use + 15-min expiry confirmed in flow; verify token entropy, rate-limiting per email (throttler is global at 5/60s — confirm it covers `/auth/magic-link`), and that tokens are invalidated after use. |
| 4.3 🟠 | JWT/session | 7-day JWT — confirm storage (httpOnly cookie per recent OAuth commit), CSRF posture, and refresh/expiry UX. |
| 4.4 🟠 | Secrets | Dev `JWT_SECRET` is committed in `.env` (gitignored, but rotate for any shared/staging env). No real secrets in repo. |
| 4.5 🟡 | CORS | API CORS is `WEB_URL` + credentials — confirm it's locked to the real web origin in prod. |

---

## 5. End-to-end test plan (the "heartbeat" + spot-checks)

Goal: an automated suite that proves the core loop works on every push.

| # | Item | Description |
|---|------|-------------|
| 5.1 🔴 | Core loop e2e | Brand signs in → search → contact creator (message + brief) → creator signs in → sees unread → accepts. Automate with Playwright against seeded data. |
| 5.2 🟠 | Auth e2e | Request magic link → read token from dev log/DB → verify → routed by role. Cover expired + reused token. |
| 5.3 🟠 | Search/filter e2e | Filter by nicho/país/seguidores/audiencia returns expected seeded creators; empty-state renders. |
| 5.4 🟠 | AI match e2e | Brief → criteria → ranked results in **both** heuristic mode (no key) and LLM mode (mocked provider). |
| 5.5 🟡 | Media-kit e2e | Edit profile → public `/c/:username` renders → share link + OG meta present. |
| 5.6 🟡 | Admin e2e | Verify/suspend a user changes their visibility in search. |
| 5.7 🟡 | Unit coverage gaps | `matchScore`, `buildCreatorWhere`, aggregate-recompute extension — pure functions, cheap to test, high value. |

---

## 6. UX / polish for launch

| # | Item | Description |
|---|------|-------------|
| 6.1 🟡 | Theme consistency | Decide light-only vs. real dark mode. If dark is wanted later, do it properly (component-level), not via the boilerplate media query. |
| 6.2 🟡 | Loading/empty/error states | Audit each page for spinners, empty results, and API-error toasts. |
| 6.3 🟡 | Mobile responsiveness | Search filters + cards on small screens. |
| 6.4 🟡 | i18n consistency | Spanish (voseo) throughout — catch any English leakage. |

---

## 7. Adopting Spec Kit (suggested order)

1. `specify init` in the repo (choose the Claude integration).
2. `/speckit.constitution` — encode the non-negotiables: *"every PR must pass the E2E boot + core-loop suite"*, *"no committed type errors"*, *"authZ on every procedure"*. This directly addresses the root cause (unverified changes shipping).
3. Turn each section above into a spec, roughly in this order:
   - **Spec 001:** Build/tooling hardening + E2E boot CI (§2, §5.1–5.2) — unblocks reliable iteration.
   - **Spec 002:** Security & authZ audit (§4).
   - **Spec 003:** Correctness review of unread routers (§3).
   - **Spec 004:** Full E2E suite (§5).
   - **Spec 005:** UX polish (§6).
4. For each: `/speckit.specify` → `/speckit.clarify` → `/speckit.plan` → `/speckit.tasks` → `/speckit.implement`.
5. Optionally `/speckit.taskstoissues` to push tasks to GitHub and track the MVP burndown.

> Recommended MVP launch gate: §1 (done) + §2.1 + §4.1 + §5.1 all green.
