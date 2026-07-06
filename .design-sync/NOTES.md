# design-sync notes — CreatorLink (@repo/web)

The DS is a Tailwind v4 system embedded in the Next.js app `apps/web`, not a
standalone package. There is a `.storybook/` scaffold in `packages/ui`, but it
is EMPTY (no stories, no components) — treat this repo as the **package shape**
(`cfg.shape: "package"`), not storybook.

## Build architecture (why the config looks the way it does)
- **Entry**: `apps/web/.ds-assets/entry.tsx` — a hand-written barrel re-exporting
  the scoped components. Passed via `--entry` (NOT `cfg.entry`, which is
  cwd-relative and would misresolve). Synth-entry over all of `src/` would
  `export *` every Next page and break the bundle.
- **process shim**: `apps/web/.ds-assets/process-shim.ts` is imported FIRST in
  the barrel. Next's client runtime (next/link, next/navigation) and the flags
  module read `process.env.*` at module-eval time → "process is not defined"
  aborts the whole IIFE. The shim (no imports of its own) runs before them.
  Do not remove or reorder it.
- **CSS**: `apps/web/.ds-assets/theme.css` mirrors `src/app/globals.css` but binds
  the `@theme` font tokens directly to the real families (the app indirects them
  through next/font vars that don't exist here). Compile before every build:
  `./.ds-sync/node_modules/.bin/tailwindcss -i apps/web/.ds-assets/theme.css -o apps/web/.ds-assets/compiled.css`
  `cfg.cssEntry` points at the compiled output (gitignored). `@import "tailwindcss" source(none)` + explicit `@source` (components + previews) keeps it deterministic.
- **Fonts**: Bricolage Grotesque / Hanken Grotesk / Geist Mono are `next/font/google`.
  Fetched (latin subset woff2) via `.ds-sync/fetch-fonts.mjs` → `apps/web/.ds-assets/fonts.css` (`cfg.extraFonts`). Re-run only if fonts change.
- **.d.ts**: no shipped types → all contracts are hand-written in `cfg.dtsPropsFor`.
- **--node-modules**: `apps/web/node_modules` (react 19 resolves there).

## Build + validate commands
```
./.ds-sync/node_modules/.bin/tailwindcss -i apps/web/.ds-assets/theme.css -o apps/web/.ds-assets/compiled.css
node .ds-sync/package-build.mjs --config .design-sync/config.json --node-modules apps/web/node_modules --entry apps/web/.ds-assets/entry.tsx --out ./ds-bundle
node .ds-sync/package-validate.mjs ./ds-bundle
```

## Preview authoring learnings
- Import components from `@repo/web` (redirected to `window.CreatorLink`).
- Use **inline styles** for layout wrappers in previews (not new Tailwind classes),
  so the compiled CSS (scanned from component src) stays complete — no recompile
  needed per preview.
- **Overlays (Modal, Drawer)**: `cfg.overrides.<Name> = {cardMode:"single", viewport:"WxH"}`
  AND wrap the component in an in-flow spacer `<div style={{height: N}}>` — the
  single-card container has `transform`, so the component's `position:fixed`
  resolves against it but the container collapses to 0 height without a spacer,
  clipping the overlay at the top.
- Use realistic Spanish content and real niche slugs (nicheLabel resolves them).

## Data-coupled components → floor cards (deliberate, not failures)
These call tRPC hooks (`trpc.*.useQuery/useMutation`), `useBootstrap`, or
`useRouter` at the component top, which throw without a provider/Next context, so
they render the honest typographic floor card rather than a preview:
**AppHeader, NotificationBell, ContactButton, AudienceEditor, ContactsInboxPage, RolePage**.
Authoring a real preview would require standing up a tRPC + QueryClient + Next
router provider chain, and the queries would still be empty (no server). They ship
fully importable with real `.d.ts` contracts; the floor card is the correct baseline.

## Known render warns
- Drawer/Modal use `cardMode:single` — a single-cell "variants render identically"
  style warn is not applicable (one export by design).

## Re-sync risks
- **Fonts are fetched from Google Fonts at sync time**, not committed under the
  repo by default (woff2 live in gitignored `.ds-assets/`). A fresh clone must
  re-run `.ds-sync/fetch-fonts.mjs apps/web/.ds-assets` before building, or ship
  the woff2 in the repo.
- `apps/web/.ds-assets/compiled.css` is gitignored — recompile before every build.
- The handoff drop-ins (`CreatorCard`, `ContactsInboxPage`, `RolePage`) live under
  `apps/web/.ds-assets/handoff/` (copied from the design handoff zip). The handoff
  `CreatorCard` **supersedes** the app's `src/components/CreatorCard.tsx`.
- `cfg.dtsPropsFor` is hand-written — if a component's real props change, update it.
