'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useBootstrap } from '@/lib/useBootstrap';
import { Spinner } from '@/components/ui';
import { es } from '@/lib/i18n';

/**
 * Refreshed role-selection step.
 * Replaces apps/web/src/app/onboarding/role/page.tsx
 *
 * Changes: selectable cards (violet ring on the active choice) instead of
 * navigate-on-click, a subtitle, and a Continuar CTA — matching the stepper
 * onboarding flow in the HTML reference. Navigation targets unchanged.
 *
 * If you keep the multi-page onboarding (role → creator/org), the "Continuar"
 * button routes to the chosen sub-flow. The full stepper (role → profile →
 * publish) in the HTML mock is optional — adopt it only if you want a single
 * onboarding route.
 */
export default function RolePage() {
  const router = useRouter();
  const { data, isLoading, isError } = useBootstrap();
  const [role, setRole] = useState<'creator' | 'org' | null>(null);

  useEffect(() => {
    if (isError) router.replace('/login');
    else if (data && data.role !== 'none') router.replace('/dashboard');
  }, [data, isError, router]);

  if (isLoading || (data && data.role !== 'none')) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <Spinner />
      </main>
    );
  }

  const options = [
    { key: 'creator' as const, icon: '🎬', title: es.roles.creator, desc: es.roles.creatorDesc, href: '/onboarding/creator' },
    { key: 'org' as const, icon: '🏢', title: es.roles.org, desc: es.roles.orgDesc, href: '/onboarding/org' },
  ];

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-6 py-16">
      <h1 className="mb-1 text-center text-3xl font-bold tracking-tight text-ink">{es.roles.title}</h1>
      <p className="mb-8 text-center text-muted">Elegí tu rol para personalizar tu experiencia.</p>

      <div className="grid gap-4 sm:grid-cols-2">
        {options.map((o) => {
          const active = role === o.key;
          return (
            <button
              key={o.key}
              onClick={() => setRole(o.key)}
              className={
                'rounded-[18px] border-2 bg-surface p-6 text-left shadow-card transition-colors ' +
                (active ? 'border-accent' : 'border-line hover:border-ink/30')
              }
            >
              <div
                className={
                  'flex h-11 w-11 items-center justify-center rounded-xl text-xl ' +
                  (active ? 'bg-accent-soft' : 'bg-line-soft')
                }
              >
                {o.icon}
              </div>
              <h2 className="mt-4 text-lg font-bold text-ink">{o.title}</h2>
              <p className="mt-1 text-sm text-muted">{o.desc}</p>
            </button>
          );
        })}
      </div>

      <button
        disabled={!role}
        onClick={() => role && router.push(options.find((o) => o.key === role)!.href)}
        className="mt-8 self-end rounded-lg bg-ink px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-ink-soft active:scale-[.98] disabled:opacity-40 disabled:active:scale-100"
      >
        {es.common.continue}
      </button>
    </main>
  );
}
