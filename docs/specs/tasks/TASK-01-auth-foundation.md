# TASK-01 — Auth Foundation

*Critical path 🔴 · blocks every authenticated procedure · Depends on: none*

## Objective
Make the tRPC layer authenticated. Resolve the caller's identity into `ctx.userId`, expose role resolution, and add role-gating middlewares. Fix the three auth bugs from the Step 4 review (CC-1/2/3).

## Context
The JWT (`sub`=userId, `email`), the `session` httpOnly cookie, and `isNewUser` already exist. But `trpc.router.ts` hardcodes `ctx.userId = undefined`, so `protectedProcedure` (which is written correctly) is unreachable. The session cookie is also issued on inconsistent origins and never attached to tRPC calls.

## Decisions made (best-practice) — REVISED per REVIEW-01
- **↻ Route browser tRPC through a Next.js proxy** (`/api/trpc/[trpc]`) that forwards the first-party `session` cookie to the API server-side. *(Rationale: Vercel web + Railway api are cross-site; `SameSite=Lax` cookies aren't sent on cross-site fetch and `SameSite=None` is increasingly blocked. A first-party proxy keeps the cookie `Lax`, avoids CORS/ITP entirely.)* This replaces the earlier "API-origin cookie + credentials:include" decision.
- **Cookie stays first-party on the web origin.** Magic-link verify (web route) keeps setting the cookie; Google callback redirects to web which sets it (or API sets then web reads via proxy). The proxy attaches it to API calls.
- **Kill `isNewUser`.** Remove it from verify/callback responses. After login the client calls `me.bootstrap` and routes on `role === 'none'`. Single source of truth, no fragile heuristics.
- **Reject suspended users in context** — the JWT has no revocation (7-day expiry), so `protectedProcedure`/context loads the user and rejects `suspended` with `FORBIDDEN`.
- **Validated capability gating** — `orgProcedure(capability)` checks against a shared `CAPABILITIES` constant (prevents typo-deny).
- **Explicit cookie parse** — read `session=` from the Cookie header manually (no `cookie-parser` dep).

## Scope
**In:** Next.js tRPC proxy · cookie/JWT parsing in tRPC context · shared `verifyJwt()` · `me.bootstrap` · `creatorProcedure` / validated `orgProcedure` / `adminProcedure` · reject-suspended-in-context · `CAPABILITIES` constant · logout route · fix CC-1/2/3 (remove `isNewUser`).
**Out:** any feature procedure (TASK-03+), refresh tokens.

## Requirements
1. **`verifyJwt(token): {sub,email} | null`** — shared helper in `packages/trpc` or api util; used by both passport strategy and tRPC context.
2. **tRPC context** (`createContext`): read `session` from the `Cookie` header (fallback `Authorization: Bearer`), verify, set `ctx.userId = payload.sub` or leave undefined. `handleRequest` already copies headers, so parse the cookie string there.
3. **Middlewares** (extend `trpc.ts`):
   - `protectedProcedure` — exists; keep.
   - `creatorProcedure` = protected + assert `db.creatorProfile` exists for `userId`, attach `creatorId` to ctx, else `FORBIDDEN`.
   - `orgProcedure` (factory) = protected + assert membership in an org with required capability, attach `{orgId, capabilities}`, else `FORBIDDEN`.
   - `adminProcedure` = protected + assert `user.isAdmin`, else `FORBIDDEN`.
4. **`me.bootstrap`** (protected query) → `{ user, role: 'creator'|'org_member'|'admin'|'none', creatorProfile?, orgs[] }`. Role precedence: admin > has profile = creator > has membership = org_member > none.
5. **CC-2 fix:** magic-link `verifyMagicLink` returns `isNewUser` based on `!creatorProfile && !orgMember` (not `!name`).
6. **CC-1 fix:** API issues the session cookie on magic-link verify; web route stops setting it; both tRPC links add `credentials:'include'`.

## Contracts
```ts
type Role = 'admin' | 'creator' | 'org_member' | 'none';
me.bootstrap(): {
  user: { id; email; name?; avatar?; isAdmin };
  role: Role;
  creatorProfile?: { id; username; published };
  orgs: { id; name; capabilities: string[]; role: 'owner'|'member' }[];
}
```

## Acceptance criteria
- A logged-in browser session makes an authenticated tRPC call and is authorized; an anonymous call to a protected procedure returns `UNAUTHORIZED`.
- `creatorProcedure`/`orgProcedure`/`adminProcedure` reject users lacking the role with `FORBIDDEN`.
- `me.bootstrap` returns the correct role for: admin, creator-only, org-only, and brand-new users.
- Both magic-link and Google logins land a new user with no role on `/onboarding/role` and a returning user on `/dashboard` (route stubs may exist from TASK-04).

## Test plan
- Unit: `verifyJwt` (valid/expired/garbage); each middleware authorize/reject; `me.bootstrap` role precedence.
- Integration: cookie→context resolution; anonymous rejection; CORS credentialed request from web origin.

## Human review
- [ ] Confirm "cookie on API origin in both flows" vs. a Next.js tRPC proxy — approve the chosen model.
- [ ] Confirm `FORBIDDEN` vs `UNAUTHORIZED` semantics for missing capability.
- [ ] Confirm role precedence (admin > creator > org_member).
- [ ] Confirm we are NOT adding refresh tokens in this slice.
