# Feature Specification: E2E Boot CI & Core-Loop Tests

**Feature Branch**: `001-e2e-boot-ci`

**Created**: 2026-06-20

**Status**: Draft

**Input**: User description: "E2E boot CI and core-loop Playwright tests to gate the MVP"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - The app boots from a clean clone (Priority: P1)

A developer (or CI) checks out the repo, installs, sets up the database, and starts
the API and web — and it works, every time, without manual patching. This is the
single most important guarantee for shipping an MVP, because the project's recurring
failure mode has been "documented but not actually runnable."

**Why this priority**: If the app doesn't boot reliably, nothing else can be trusted.
This gate would have caught every bug found during initial setup (Express 5 route,
esbuild link, Node/TS loader, OAuth crash).

**Independent Test**: A CI job runs `install → db:generate → migrate:deploy → seed →
build → boot API → boot web`, then asserts the API answers and a magic link is issued.
Green = the documented path works.

**Acceptance Scenarios**:

1. **Given** a clean checkout, **When** CI runs the boot job, **Then** the API process
   reaches "API running on port" and responds to a request without error.
2. **Given** the API is up with no `GOOGLE_CLIENT_ID`/`LLM_API_KEY`, **When** it boots,
   **Then** it does not crash (optional features degrade) — per Constitution V.
3. **Given** the API is up, **When** `POST /auth/magic-link` is called for a seeded
   user, **Then** it returns success and a verifiable token is produced.

---

### User Story 2 - The brand→creator heartbeat works end-to-end (Priority: P1)

A brand signs in, searches creators, opens a creator and sends a contact message with
a brief; the targeted creator signs in, sees an unread proposal, and accepts it. This
is the product's core value loop.

**Why this priority**: It is the MVP's reason to exist. If it regresses, the product is
broken even if everything compiles.

**Independent Test**: A Playwright test drives the seeded brand and creator accounts
through the full loop against locally running web+API, asserting the proposal appears
and can be accepted.

**Acceptance Scenarios**:

1. **Given** a signed-in brand, **When** they search with no filters, **Then** seeded
   published creators are listed.
2. **Given** a brand viewing a creator, **When** they send a message + brief, **Then**
   the proposal is persisted and confirmation is shown.
3. **Given** the targeted creator signs in, **When** they open received proposals,
   **Then** the new proposal shows as unread and can be accepted.

---

### User Story 3 - Auth round-trip is covered, including failure modes (Priority: P2)

Magic-link login is the only auth path used in local/CI. It must be tested for the
happy path and for expired / reused tokens.

**Why this priority**: Every other e2e test depends on login working; failure modes
(expired, reused) are common real-world bugs.

**Independent Test**: A test requests a magic link, reads the token from the DB (or dev
log), verifies it, and asserts a session; then asserts a reused/expired token is rejected.

**Acceptance Scenarios**:

1. **Given** a seeded user, **When** they request and use a fresh magic link, **Then**
   they are signed in and routed by role.
2. **Given** an already-used token, **When** it is submitted again, **Then** verification
   is rejected.

---

### Edge Cases

- API port already in use (local dev) — boot must fail loudly, CI uses a clean port.
- Empty search result set renders an empty state, not an error.
- Magic link expired (>15 min) is rejected.
- Optional config present-but-invalid (e.g. LLM key set, provider down) must not break
  the heuristic path.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: CI MUST run a job that provisions Postgres, runs migrations, seeds, builds
  all workspaces, and boots the API against the seeded DB.
- **FR-002**: The boot job MUST fail the build if the API does not become healthy within
  a timeout, or if `pnpm build` reports any type error.
- **FR-003**: The suite MUST verify magic-link issuance and verification for a seeded user.
- **FR-004**: A Playwright e2e MUST exercise the brand→creator heartbeat end-to-end
  against running web + API.
- **FR-005**: Tests MUST authenticate via a deterministic path (read the magic-link token
  programmatically from the DB) so they run unattended in CI.
- **FR-006**: The suite MUST run on every pull request to `main` and block merge on failure.
- **FR-007**: Boot MUST succeed with optional integrations unset (no Google/LLM/email keys).

### Key Entities *(include if feature involves data)*

- **Seeded User**: brand (`brand@example.com`), creators (`maria@/tomas@/luana@example.com`),
  admin — the fixtures the e2e relies on.
- **MagicLinkToken**: single-use, 15-min token; the programmatic auth handle for tests.
- **Proposal/Contact**: the message + brief a brand sends a creator; the artifact the
  heartbeat test asserts on.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A clean clone reaches a booted API in CI in under ~10 minutes, with zero
  manual steps.
- **SC-002**: The core-loop e2e passes deterministically (no flakes across 5 consecutive runs).
- **SC-003**: 100% of PRs to `main` run the boot + core-loop suite before merge.
- **SC-004**: Every bug class hit during initial setup (route syntax, missing binary,
  TS loader, OAuth-required) is now caught automatically by this suite.

## Assumptions

- Local dev and CI use a TS-aware runtime (Node 24 native or the `tsx` loader already
  wired into the API `dev` script). Pinning/normalizing this is tracked separately
  (MVP-PUNCHLIST §2.2/2.3); this spec boots via the working `dev` path.
- Postgres 16 in CI (matches local `docker postgres:16` / native 14 — schema is compatible).
- The existing seed is authoritative for test fixtures.
- Playwright is acceptable as the e2e tool (Chromium only for MVP).
