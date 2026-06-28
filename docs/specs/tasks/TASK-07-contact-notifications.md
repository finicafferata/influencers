# TASK-07 — Contact + Notifications (closes the loop)

*Medium priority · the conversion event · Depends on: TASK-05, TASK-06*

## Objective
Let an org send a structured contact (with campaign brief) to a creator, notify the creator in-app, and let the creator respond. This gives the two-sided loop its heartbeat.

## Decisions made (best-practice)
- **In-app only** (decision 2): notification + inbox. No external email thread in this slice. *(An optional email "you have a new contact" nudge is noted as a fast-follow, not built now.)*
- **Contact creation and its notification are atomic** (one transaction) — a contact must never exist without its notification.
- **Per-creator dedupe enforced at the DB** (REVIEW-01 C3): partial unique index `(fromUserId, toCreatorId) WHERE status='pending'`. `contact.send` relies on the constraint (catch unique-violation → `CONFLICT`), not a racy app-layer check. Re-contact allowed only after the prior is resolved.
- **`updateStatus` ownership** (REVIEW-01 C6): assert `contact.toCreatorId === ctx.creatorId` — being *a* creator is not enough.
- **Throttling:** reuse the global `ThrottlerModule`; add a tighter per-procedure limit on `contact.send` to prevent spam.

## Scope
**In:** `contact.*` + `notification.*` procedures; contact modal; creator inbox; notification bell.
**Out:** internal messaging/threads (backlog), email notifications (fast-follow), reviews (backlog).

## Requirements — procedures
1. `contact.send` (orgProcedure, `can_search_creators`): `{ toCreatorId, message (≤2000), campaignBrief? (≤4000) }`. Sets `orgName` from caller's org. **Transaction:** create `Contact{status:'pending', fromUserId, orgName}` + `Notification{userId: creator.userId, type:'contact', title, body, link:'/dashboard/contacts'}`. The **partial unique index** enforces dedupe — catch the unique-violation and return `CONFLICT`. Tight per-route throttle.
2. `contact.listForCreator` (creatorProcedure query): the creator's received contacts, newest first, with sender org + brief + status.
3. `contact.updateStatus` (creatorProcedure mutation): `pending → accepted | declined`. **Assert `contact.toCreatorId === ctx.creatorId`** (recipient only — being a creator is not enough). Optionally emit a notification back to the sender.
4. `contact.listSentByOrg` (orgProcedure query): contacts the org has sent (for "Contactado" state + dedupe).
5. `notification.list` (protected query, unread-first, paginated) · `markRead` · `markAllRead` · `unreadCount`.

## Requirements — UI
6. **Contact modal** (from the creator card, TASK-06): campaign brief + message fields → `contact.send`; success toast; card flips to "Contactado".
7. **`/dashboard/contacts`** (creator inbox): list of received contacts with brief, sender org, date, status; Aceptar / Rechazar actions.
8. **Notification bell** in the header: `unreadCount` badge, dropdown via `notification.list`, items link to their target; opening marks read.

## Contracts
```ts
contact.send({ toCreatorId, message, campaignBrief? }): Contact
contact.updateStatus({ contactId, status: 'accepted'|'declined' }): Contact
notification.list({ cursor?, limit? }): { items: Notification[]; nextCursor }
notification.unreadCount(): { count: number }
```

## Acceptance criteria
- Org sends a contact with a brief → a `Contact` and a `Notification` are created atomically → creator sees the unread bell + inbox item → creator accepts/declines → status updates.
- A duplicate pending contact from the same org is blocked with a clear message; card shows "Contactado".
- Non-org users cannot call `contact.send`; only the recipient can change a contact's status.

## Test plan
- Unit: dedupe rule; status-transition guard (only recipient, only from pending); throttle limit.
- Integration: `contact.send` atomicity (rollback leaves neither row); notification fan-out.
- E2E (the loop): seed creator → org search → open card → send contact → creator notification + inbox → accept. **This is the slice's definition of done.**

## Human review
- [ ] Approve in-app-only (no email nudge in this slice).
- [ ] Approve dedupe rule (one pending contact per org→creator).
- [ ] Approve whether accept/decline notifies the sender back.
- [ ] Approve `contact.send` throttle limit.
