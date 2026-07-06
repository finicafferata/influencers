'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { trpc } from '@/lib/trpc/client';
import { useBootstrap } from '@/lib/useBootstrap';
import { AppHeader } from '@/components/AppHeader';
import { Spinner } from '@/components/ui';
import { es } from '@/lib/i18n';

/**
 * Refreshed dashboard.
 * Layout: greeting → status banner (driven by real `published` state) →
 * action cards (with a live pending-proposals badge) using shadow-card.
 *
 * Note vs. the HTML mock: the mock's numeric "85% completeness" ring and the
 * recent-activity feed are illustrative — there is no completeness score or
 * activity endpoint in the API, so the banner reflects the real published/
 * unpublished state instead, and the activity list is omitted until a feed
 * exists. Role/capability gating (canSearch, isAdmin) is unchanged.
 */
export default function DashboardPage() {
  const router = useRouter();
  const { data, isLoading, isError } = useBootstrap();

  const isCreator = data?.role === 'creator';
  const contacts = trpc.contact.listForCreator.useQuery(undefined, {
    retry: false,
    enabled: isCreator,
  });
  const pending = (contacts.data ?? []).filter((c) => c.status === 'pending').length;

  useEffect(() => {
    if (isError) router.replace('/login');
    else if (data && data.role === 'none') router.replace('/onboarding/role');
  }, [data, isError, router]);

  if (isLoading || !data || data.role === 'none') {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <Spinner />
      </main>
    );
  }

  const canSearch = data.orgs.some((o) => o.capabilities.includes('can_search_creators'));
  const published = data.creatorProfile?.published ?? false;

  return (
    <>
      <AppHeader />
      <main className="mx-auto max-w-4xl px-4 py-10">
        <h1 className="mb-1 text-[28px] font-bold tracking-tight text-ink">
          Hola{data.user.name ? `, ${data.user.name}` : ''} 👋
        </h1>
        <p className="mb-7 text-[15px] text-muted">
          {isCreator
            ? published
              ? 'Tu perfil está publicado y visible para marcas.'
              : 'Completá y publicá tu perfil para aparecer en búsquedas.'
            : 'Encontrá creadores y gestioná tus campañas.'}
        </p>

        {/* status banner (creator only) — reflects real published state */}
        {isCreator && (
          <div className="mb-6 flex items-center gap-[18px] rounded-card border border-line bg-surface p-5 shadow-card">
            <span
              className={
                'flex h-14 w-14 flex-none items-center justify-center rounded-full text-2xl ' +
                (published ? 'bg-accent-soft' : 'bg-line-soft')
              }
            >
              {published ? '✅' : '📝'}
            </span>
            <div className="flex-1">
              <div className="text-[15px] font-bold text-ink">
                {published ? 'Perfil publicado' : 'Perfil sin publicar'}
              </div>
              <p className="mt-0.5 text-[13px] text-muted">
                {published
                  ? 'Las marcas ya pueden encontrarte y enviarte propuestas.'
                  : 'Publicá tu perfil para aparecer en las búsquedas de marcas.'}
              </p>
            </div>
            <Link
              href="/dashboard/profile"
              className="whitespace-nowrap rounded-lg bg-ink px-4 py-2.5 text-[13px] font-semibold text-white transition-all hover:bg-ink-soft active:scale-[.98]"
            >
              {published ? 'Editar perfil' : 'Completar'}
            </Link>
          </div>
        )}

        {/* action cards */}
        <div className="grid gap-4 sm:grid-cols-2">
          {isCreator && (
            <>
              <Link href="/dashboard/profile">
                <div className="h-full rounded-card border border-line bg-surface p-[22px] shadow-card transition hover:border-ink">
                  <div className="flex items-center justify-between">
                    <span className="flex h-[38px] w-[38px] items-center justify-center rounded-[11px] bg-line-soft text-lg">
                      👤
                    </span>
                  </div>
                  <h2 className="mt-4 text-base font-bold text-ink">Mi perfil</h2>
                  <p className="mt-0.5 text-[13px] leading-relaxed text-muted">
                    {published ? es.creator.published : 'Completá y publicá tu perfil'}
                  </p>
                </div>
              </Link>
              <Link href="/dashboard/contacts">
                <div className="h-full rounded-card border border-line bg-surface p-[22px] shadow-card transition hover:border-ink">
                  <div className="flex items-center justify-between">
                    <span className="flex h-[38px] w-[38px] items-center justify-center rounded-[11px] bg-line-soft text-lg">
                      ✉️
                    </span>
                    {pending > 0 && (
                      <span className="inline-flex h-[22px] min-w-[22px] items-center justify-center rounded-full bg-accent px-[7px] text-xs font-bold text-accent-fg">
                        {pending}
                      </span>
                    )}
                  </div>
                  <h2 className="mt-4 text-base font-bold text-ink">{es.contact.inbox}</h2>
                  <p className="mt-0.5 text-[13px] leading-relaxed text-muted">Revisá las propuestas de marcas</p>
                </div>
              </Link>
            </>
          )}
          {canSearch && (
            <Link href="/search">
              <div className="h-full rounded-card border border-line bg-surface p-[22px] shadow-card transition hover:border-ink">
                <div className="flex items-center justify-between">
                  <span className="flex h-[38px] w-[38px] items-center justify-center rounded-[11px] bg-line-soft text-lg">
                    🔎
                  </span>
                </div>
                <h2 className="mt-4 text-base font-bold text-ink">{es.search.title}</h2>
                <p className="mt-0.5 text-[13px] leading-relaxed text-muted">Encontrá creadores para tu campaña</p>
              </div>
            </Link>
          )}
          {data.user.isAdmin && (
            <Link href="/admin">
              <div className="h-full rounded-card border border-line bg-surface p-[22px] shadow-card transition hover:border-ink">
                <div className="flex items-center justify-between">
                  <span className="flex h-[38px] w-[38px] items-center justify-center rounded-[11px] bg-line-soft text-lg">
                    ⚙️
                  </span>
                </div>
                <h2 className="mt-4 text-base font-bold text-ink">{es.admin.title}</h2>
                <p className="mt-0.5 text-[13px] leading-relaxed text-muted">Gestioná creadores, usuarios y contactos</p>
              </div>
            </Link>
          )}
        </div>
      </main>
    </>
  );
}
