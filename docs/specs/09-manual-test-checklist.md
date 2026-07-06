# CreatorLink — Step 9: Manual E2E Test Checklist

*Slice 1 — Creator Discovery & Search · Date: 2026-06-07*

Run after `pnpm install && db:generate && db:migrate && db:seed && pnpm dev`. Web on `:3000`, API on `:3001`.

> Magic-link emails: in local dev the link is logged by the API (EmailService) — copy it from the API console. Seeded users: `admin@creatorlink.app`, `maria@example.com` / `tomas@example.com` / `luana@example.com` (creators), `brand@example.com` (org owner of "Cosmética Natural SA").

## 0. Setup / smoke
- [ ] `pnpm dev` boots web + api with no startup errors.
- [ ] `GET :3000/health` shows API status `ok` (proves web→proxy→api→tRPC path).
- [ ] DB has 3 published creators + 1 org after seed (`prisma studio` or admin Users tab).

## 1. Auth + routing (EPIC-1)
- [ ] Landing `/` shows the two CTAs in Spanish; "Iniciá sesión" → `/login`.
- [ ] Request a magic link for a NEW email → open the logged link → lands on `/dashboard` → auto-redirects to `/onboarding/role` (role === 'none').
- [ ] Google OAuth (if configured) returns to `/auth/google/callback` → cookie set → `/dashboard`.
- [ ] Reload any authed page: session persists (cookie). 
- [ ] Logout clears the session; visiting `/dashboard` redirects to `/login`.
- [ ] **Suspended check:** suspend a user in admin → that user's existing session is rejected (FORBIDDEN) on next protected action.

## 2. Creator onboarding + profile (EPIC-2)
- [ ] Pick "Soy creador" → 4-step wizard.
- [ ] Step 1: username < 3 chars disables Next; valid username advances (profile created).
- [ ] Step 2: add 2 social accounts; duplicate platform is rejected.
- [ ] Step 3: pick niches (chips), content type, tags.
- [ ] Step 4: bio + rates → "Publicar perfil" → lands on `/c/<username>`.
- [ ] Completeness gate: try publishing with no social account/niche → clear "faltan campos" error.
- [ ] Edit at `/dashboard/profile`: change headline/niches → Guardar persists; username field cannot be changed.
- [ ] Unpublish → profile 404s for logged-out visitors; re-publish restores it.

## 3. Public profile (EPIC-2)
- [ ] `/c/mariag` renders SSR: header, Verificado badge (María's IG is seeded verified), métricas per platform, niches, **rates visible while logged out**, collaborations if any.
- [ ] `/c/<unpublished>` returns 404 for non-owners; owner can preview own draft.

## 4. Org onboarding (EPIC-2)
- [ ] Pick "Soy marca o agencia" → only **Marca** and **Agencia de marketing** offered (no talent/hybrid).
- [ ] Create org → redirected to `/search`; header now shows "Buscar creadores".

## 5. Search + card (EPIC-3)
- [ ] `/search` lists published creators; "{n} creadores" count correct.
- [ ] Filter by niche chip / país / plataforma / seguidores mín / engagement mín → results narrow; URL updates and is shareable (reload reproduces).
- [ ] Sort: Más seguidores / Mejor engagement / Más recientes reorder correctly; pagination ("Cargar más") has no dupes.
- [ ] Impossible filter → empty state "Ajustá los filtros…".
- [ ] Click a card → drawer shows full detail + "Contactar".
- [ ] **Guard:** a creator (no org) navigating to `/search` is redirected to `/dashboard`.

## 6. Contact loop (EPIC-4) — the heartbeat
- [ ] As the brand, open a creator card → Contactar → write message + brief → Enviar → "¡Propuesta enviada!"; card flips to "Contactado".
- [ ] Sending a 2nd contact to the same creator (still pending) → blocked with a clear conflict message.
- [ ] Log in as that creator → notification bell shows unread badge → `/dashboard/contacts` lists the proposal with brief + sender org.
- [ ] Aceptar / Rechazar updates status; sender gets a notification back.
- [ ] A non-org user cannot reach `contact.send`; a creator cannot change a contact that isn't theirs.

## 7. Notifications (EPIC-4)
- [ ] Bell unread count matches; opening the dropdown lists items; "marcar todas como leídas" zeroes the badge.

## 8. Admin (EPIC-5)
- [ ] As admin, `/admin` → Creadores tab: seed a new creator (with 1 social account, publish on) → appears in `/search`.
- [ ] Verificar cuentas: look up a username → toggle Verify on an account → Verificado badge shows on the card + public profile.
- [ ] Users tab: suspend a creator → they disappear from `/search` (profile unpublished) → reactivate restores.
- [ ] Contactos tab: lists all contacts.
- [ ] A non-admin visiting `/admin` is redirected.

## 9. i18n / mobile / a11y spot-checks
- [ ] All visible copy is Spanish; no English leakage on the core screens.
- [ ] Resize to ~375px: landing, onboarding wizard, public profile, search (filters usable), inbox all readable.
- [ ] Number/currency formatting localized (e.g. `120K`, `desde US$200`).

## Sign-off
- [ ] All Essential (E1–E7) paths pass end-to-end on the real stack.
- [ ] Known partials acknowledged: in-memory rate limiter (single-instance), UI primitives in-app (not packages/ui), avatar via URL only.
