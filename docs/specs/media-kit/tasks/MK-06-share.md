# MK-06 — ShareKit (copy/native/QR) + per-session view ping

*Frontend · Depends on: MK-04, MK-02*

## Objective
Make sharing one-tap, and record the deduped, owner-excluded view.

## Decisions
- **QR via `qrcode.react`** (add dep) — renders an inline SVG, SSR-safe.
- View dedupe is **best-effort client-side** (sessionStorage flag); owner-exclusion is enforced server-side (MK-02).

## Requirements
1. **`<ShareKit username>`** (`'use client'`): copy-link button (writes `${origin}/c/<username>`), `navigator.share()` with graceful fallback to copy, and a QR (`qrcode.react` `QRCodeSVG`) in a popover/modal. Add `qrcode.react` to `apps/web/package.json`.
2. **Surfaces**: (a) the kit hero (MK-04), and (b) a prominent "Compartí tu media kit" card on `/dashboard/profile` showing the full URL + ShareKit.
3. **View ping**: a small client island on `/c/[username]` calls `creator.recordView({ username })` once per session — guard with `sessionStorage['ck_viewed_'+username]` so a refresh doesn't double-count. (The page is otherwise a server component, so this is an isolated `'use client'` child.)

## Acceptance
- Copy puts the correct public URL on the clipboard; native share opens on mobile; QR scans to the kit URL.
- Visiting a kit increments the counter once per session; refreshing does not; the owner viewing their own kit never increments.

## Test plan
- Manual: copy, share sheet (mobile), QR scan; refresh doesn't double-count; owner view doesn't count.
- Unit: sessionStorage guard logic.

## Human review
- [ ] Approve `qrcode.react` dependency.
- [ ] Approve per-session (vs per-day) dedupe granularity.
