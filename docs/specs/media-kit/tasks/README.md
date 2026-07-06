# Media-Kit — Task Specs (Step 5)

*Phase 1 · Date: 2026-06-07 · Status: Draft for human review*

Per-task specs for the net-new media-kit work (from Step 4: ~35–40% already exists; this is the rest). Each becomes an epic/issue in Step 6.

## Decisions locked
- **QR → `qrcode.react`** (tiny, SSR-safe SVG component; don't hand-roll QR encoding).
- **OG route → Node runtime**, plain fetch to `${API_URL}/trpc/creator.getByUsername` (published-only), aggressively cached for crawlers. Do NOT reuse `getServerTrpc` (server-only/cookie-bound).
- Plus Step-2 decisions: dynamic OG · rates public-as-"desde" + hide toggle (stripped server-side) · URL embeds only · deduped owner-excluded view counter.

## Task index

| Task | Title | Layer | Depends on |
|------|-------|-------|-----------|
| [MK-01](MK-01-schema-constants.md) | Schema deltas + constants + embed helper | backend/shared | — |
| [MK-02](MK-02-router.md) | Portfolio CRUD + payload strip + recordView | backend | MK-01 |
| [MK-03](MK-03-editor.md) | Profile editor: portfolio + rates toggle + pitch + analytics | frontend | MK-02 |
| [MK-04](MK-04-kit-layout.md) | Media-kit layout redesign + gallery | frontend | MK-02 |
| [MK-05](MK-05-og.md) | Dynamic OpenGraph (metadata + image route) | frontend | MK-04 |
| [MK-06](MK-06-share.md) | ShareKit (copy/native/QR) + per-session view ping | frontend | MK-04, MK-02 |

Conventions match the Slice-1 task specs: TS/Zod-style contracts, observable acceptance criteria, a Human-review checklist per task.
