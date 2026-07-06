// The browser has no Node `process`. Next's client runtime (next/link,
// next/navigation) and the app's feature-flag module read `process.env.*` at
// module-eval time, which throws "process is not defined" and aborts the whole
// IIFE before it assigns to window.CreatorLink. This module has no imports, so
// ES module evaluation runs it before any other import in entry.tsx — giving
// everything downstream a safe `process` to read from.
declare const globalThis: { process?: unknown };
(globalThis as { process?: unknown }).process ||= {
  env: {},
  nextTick: (fn: (...a: unknown[]) => void, ...a: unknown[]) =>
    Promise.resolve().then(() => fn(...a)),
};
