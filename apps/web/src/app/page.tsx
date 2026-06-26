import Link from 'next/link';
import { es } from '@/lib/i18n';

/* ── Faux product preview (the hero's visual anchor) ───────────────── */
const MOCK = [
  { handle: 'mariag', name: 'M', country: 'Argentina', niches: ['Belleza', 'Lifestyle'], reach: '120K', eng: '4.5%', verified: true },
  { handle: 'tomasfit', name: 'T', country: 'México', niches: ['Fitness', 'Bienestar'], reach: '210K', eng: '5.4%', verified: false },
  { handle: 'luanatech', name: 'L', country: 'Brasil', niches: ['Tecnología', 'Gaming'], reach: '64K', eng: '6.0%', verified: true },
];

function PreviewCard({ c }: { c: (typeof MOCK)[number] }) {
  return (
    <div className="rounded-xl border border-line bg-surface p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-ink text-sm font-semibold text-white">
          {c.name}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1">
            <span className="truncate text-sm font-semibold text-ink">@{c.handle}</span>
            {c.verified && (
              <span className="rounded-full bg-accent-soft px-1.5 py-0.5 text-[10px] font-bold text-accent-soft-fg">✓</span>
            )}
          </div>
          <p className="truncate text-xs text-muted">{c.country}</p>
        </div>
      </div>
      <div className="mt-3 flex gap-4">
        <div><div className="text-sm font-bold text-ink">{c.reach}</div><div className="text-[10px] text-muted">seguidores</div></div>
        <div><div className="text-sm font-bold text-ink">{c.eng}</div><div className="text-[10px] text-muted">engagement</div></div>
      </div>
      <div className="mt-3 flex flex-wrap gap-1">
        {c.niches.map((n) => (
          <span key={n} className="rounded-full bg-line-soft px-2 py-0.5 text-[10px] font-medium text-ink-soft">{n}</span>
        ))}
      </div>
    </div>
  );
}

function AppPreview() {
  return (
    <div className="relative mx-auto w-full max-w-4xl">
      {/* glow behind the frame */}
      <div className="absolute -inset-x-10 -top-10 bottom-0 -z-10 rounded-[2rem] bg-accent/10 blur-3xl" />
      <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-pop">
        {/* window chrome */}
        <div className="flex items-center gap-2 border-b border-line bg-canvas px-4 py-3">
          <span className="h-3 w-3 rounded-full bg-line" />
          <span className="h-3 w-3 rounded-full bg-line" />
          <span className="h-3 w-3 rounded-full bg-line" />
          <div className="ml-3 flex-1 rounded-md border border-line bg-surface px-3 py-1 text-xs text-faint">
            creatorlink.app/search
          </div>
        </div>
        {/* faux search */}
        <div className="p-5">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-ink px-3 py-1 text-xs font-medium text-white">Belleza</span>
            <span className="rounded-full border border-line px-3 py-1 text-xs font-medium text-ink-soft">México</span>
            <span className="rounded-full border border-line px-3 py-1 text-xs font-medium text-ink-soft">50K–200K</span>
            <span className="ml-auto text-xs text-muted">3 creadores</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {MOCK.map((c) => <PreviewCard key={c.handle} c={c} />)}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-canvas">
      {/* background: accent glow + faint grid */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[600px] bg-[radial-gradient(60%_60%_at_50%_0%,rgba(0,193,110,0.10),transparent_70%)]" />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.5] [mask-image:radial-gradient(70%_50%_at_50%_0%,black,transparent)]"
        style={{
          backgroundImage:
            'linear-gradient(to right, #e4e4e7 1px, transparent 1px), linear-gradient(to bottom, #e4e4e7 1px, transparent 1px)',
          backgroundSize: '44px 44px',
        }}
      />

      {/* nav */}
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <span className="flex items-center gap-2 text-lg font-bold tracking-tight text-ink">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-accent" />
          {es.appName}
        </span>
        <Link href="/login" className="rounded-lg px-4 py-2 text-sm font-semibold text-ink-soft transition-colors hover:bg-line-soft hover:text-ink">
          Iniciá sesión
        </Link>
      </div>

      {/* hero */}
      <div className="mx-auto flex max-w-3xl flex-col items-center px-6 pt-14 text-center sm:pt-20">
        <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-line bg-surface/70 px-3 py-1 text-xs font-semibold text-ink-soft backdrop-blur">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" />
          La capa profesional del creator economy en LATAM
        </span>
        <h1 className="text-balance text-4xl font-bold leading-[1.05] tracking-tight text-ink sm:text-5xl">
          Conectá <span className="text-accent">creadores</span> con marcas, sin DMs ni planillas.
        </h1>
        <p className="mt-5 max-w-lg text-pretty text-lg text-muted">
          Perfiles con métricas verificadas, búsqueda con IA y contacto directo — en un solo lugar.
        </p>
        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
          <Link
            href="/login?role=creator"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-6 py-3 text-base font-semibold text-accent-fg shadow-sm transition-all hover:bg-accent-strong active:scale-[.98]"
          >
            Soy creador
          </Link>
          <Link
            href="/login?role=org"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-line bg-surface px-6 py-3 text-base font-semibold text-ink transition-all hover:bg-line-soft active:scale-[.98]"
          >
            Soy marca o agencia
          </Link>
        </div>
      </div>

      {/* product preview */}
      <div className="mx-auto mt-16 max-w-6xl px-6 pb-10">
        <AppPreview />
      </div>

      {/* footer */}
      <footer className="mx-auto max-w-6xl px-6 py-10 text-center text-sm text-muted">
        <span className="flex items-center justify-center gap-2 font-semibold text-ink-soft">
          <span className="inline-block h-2 w-2 rounded-full bg-accent" />
          {es.appName}
        </span>
        <p className="mt-2">Hecho para creadores y marcas de LATAM · {new Date().getFullYear()}</p>
      </footer>
    </main>
  );
}
