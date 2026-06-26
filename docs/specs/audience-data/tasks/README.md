# Audience Data & Quality — Task Specs (Step 5)

*Phase 3 · Date: 2026-06-07 · Status: Draft for human review*

Per-task specs for the net-new + modify work (Step 4: ~55–60% scaffolding reusable). Each becomes an epic/issue in Step 6.

## Decisions locked
- **Filter merge:** audience country merges into the **same** `accountFilter` in `buildCreatorWhere` (one account satisfies reach **and** audience) — never a second `socialAccounts` key (avoids the overwrite trap).
- **Scoring availability:** add `audienceTopCountry` to `CREATOR_CARD_INCLUDE` **and** widen `ScoreCandidate`; the audience component is **neutral (=1) when unset** (preserves Phase-2 ranking).
- **Match pool:** `audienceCountry` constrains the **primary** pool only; the relaxed pool stays country-only (surfaces audience near-misses).
- Plus Step-2 decisions: self-declared + admin-verified (providers deferred) · top-3 countries / 5 age bands / gender split · per-account · v1 filter = audience country · qualitative badge.

## Task index

| Task | Title | Layer | Depends on |
|------|-------|-------|-----------|
| [AD-01](AD-01-schema-includes.md) | Schema + constants + include extensions | backend | — |
| [AD-02](AD-02-router.md) | setAudience + admin verifyAudience | backend | AD-01 |
| [AD-03](AD-03-discovery.md) | Audience filter + match scoring | backend | AD-01 |
| [AD-04](AD-04-filter-ui.md) | Audience-country control in CreatorFilters | frontend | AD-03 |
| [AD-05](AD-05-editor.md) | Per-account audience editor | frontend | AD-02 |
| [AD-06](AD-06-display-admin.md) | Kit Audiencia display + admin verify UI | frontend | AD-02 |

Conventions match prior task specs.
