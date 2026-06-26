# EPIC-4 — Contact & Notifications

*Status: Draft · Wraps TASK-07 · Depends on: EPIC-3 · Closes the loop*

## Goal
An org sends a structured contact with a brief; the creator is notified in-app and can accept/decline. This is the slice's conversion event and its definition of done.

## Definition of Done (Gate B)
Seed creator → org search → open card → send contact → creator sees unread bell + inbox item → accepts/declines. The two-sided loop has a heartbeat, end-to-end on the real stack.

---

### Backend

### ISS-4.1 — `contact.send` (atomic + dedupe + throttle) · `M`
orgProcedure (`can_search_creators`); transaction creates `Contact{pending}` + `Notification`; block duplicate pending org→creator (`CONFLICT`); tighter per-procedure throttle.
**Acceptance:** both rows created atomically (rollback leaves neither); duplicate blocked; throttle enforced.
**Deps:** EPIC-3. **Review:** transaction + dedupe + throttle.

### ISS-4.2 — `contact.listForCreator` / `updateStatus` / `listSentByOrg` · `M`
Inbox query; status transition pending→accepted/declined (recipient only); org sent-list for dedupe/Contactado.
**Acceptance:** only recipient can transition; only from pending; sent-list powers Contactado.
**Deps:** ISS-4.1. **Review:** transition guard.

### ISS-4.3 — `notification` router · `S`
`list` (unread-first, paginated), `markRead`, `markAllRead`, `unreadCount`.
**Acceptance:** unread count accurate; mark-read flips state.
**Deps:** ISS-4.1. **Review:** pagination + counts.

### Frontend

### ISS-4.4 — Contact modal · `M`
From the creator card: campaign brief + message → `contact.send`; success toast; card → Contactado.
**Acceptance:** valid send succeeds + toast; card state flips; validation on empty message.
**Deps:** ISS-4.1, ISS-3.6. **Review:** wired to card.

### ISS-4.5 — `/dashboard/contacts` inbox · `M`
Creator inbox: brief, sender org, date, status; Aceptar/Rechazar.
**Acceptance:** received contacts list; accept/decline updates status live.
**Deps:** ISS-4.2. **Review:** matches `listForCreator`.

### ISS-4.6 — Notification bell · `S`
Header bell with `unreadCount` badge; dropdown via `list`; items link + mark read on open.
**Acceptance:** badge reflects unread; opening marks read; link navigates.
**Deps:** ISS-4.3. **Review:** badge accuracy.

---

## Human review checklist (Gate A)
- [ ] Approve in-app-only (no email nudge this slice).
- [ ] Approve one-pending-contact dedupe rule.
- [ ] Approve whether accept/decline notifies the sender back.
- [ ] Approve `contact.send` throttle limit.
