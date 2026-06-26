# MK-04 — Media-kit layout redesign + gallery

*Frontend (`/c/[username]`) · Depends on: MK-02 · A restyle, not a rebuild*

## Objective
Turn the existing SSR public profile into a credible, scannable, shareable media kit.

## Requirements
1. **Hero**: avatar, name, `@username`, **pitch** (new) + headline, país, Verificado badge, **share button** (MK-06). Restyle the existing hero (page.tsx:31–44).
2. **Stat band**: per-platform reach + engagement, made prominent (reuse existing `Stat` + formatters).
3. **Work gallery** (new): render `portfolio` via `lib/embed.ts` — images inline, video/social as thumbnail cards, links as titled cards. Responsive grid.
4. **Brands**: upgrade collaborations to logo chips when `brandLogo` present, else text chip.
5. **Rates**: "desde {money}" per deliverable when present; when the payload omits rates (private), show "Tarifas a consultar".
6. **CTA**: existing org-gated `ContactButton` + share.
7. **Mobile-first**: this is the most-shared screen; verify 375px.

## Acceptance
- `/c/<username>` reads as a media kit: hero with pitch, prominent stats, a work gallery, brand logos, rates-or-"a consultar", contact + share — clean on mobile and desktop.
- Unpublished profiles still 404 for non-owners (unchanged).

## Test plan
- Manual: each portfolio type renders; private-rates state; mobile layout.
- Visual check vs. a typical Canva media kit (does it credibly replace one?).

## Human review
- [ ] Approve gallery layout (grid vs. masonry vs. carousel).
- [ ] Approve brand-logo upgrade (needs `brandLogo` populated; otherwise text).
