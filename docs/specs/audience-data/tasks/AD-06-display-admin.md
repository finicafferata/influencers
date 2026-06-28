# AD-06 — Kit Audiencia display + admin verify UI

*Frontend · Depends on: AD-02*

## Objective
Show audience demographics + authenticity on the kit, and let admins verify it.

## Requirements
1. **Kit** (`/c/[username]`): an **Audiencia** section (near "Redes"), per account or blended:
   - top countries with % (bar or list), gender split bar, age bands.
   - **"Audiencia verificada"** badge when `audienceVerified`; honest **"declarada por el creador"** label otherwise (reuse the `a.verified` badge pattern).
   - Render only when audience data exists.
2. **Admin** (admin creators tab → `VerifyAccountsPanel`): show each account's audience-verification state and **Verificar / Quitar** audiencia buttons → `admin.verifyAudience` / `unverifyAudience`.

## Acceptance
- Kit shows who the creator reaches + the authenticity state, honestly labeled.
- Admin toggles audience verification; the badge updates on the kit.

## Test plan
- Manual: kit display with/without audience, verified vs declared; admin verify toggles badge; mobile; Spanish copy.

## Human review
- [ ] Approve per-account vs blended audience display on the kit.
- [ ] Approve honest declared-vs-verified labeling.
