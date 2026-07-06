'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc/client';
import { AppHeader } from '@/components/AppHeader';
import { Badge, EmptyState, Spinner } from '@/components/ui';
import { es } from '@/lib/i18n';

/**
 * Refreshed Contacts / inbox — two-pane master-detail.
 * Replaces the single-column card list at
 *   apps/web/src/app/dashboard/contacts/page.tsx
 *
 * Uses the SAME tRPC hooks and data shape as before
 * (contact.listForCreator + contact.updateStatus). Adds:
 *  - filter tabs (Todas / Nuevas / Aceptadas) with counts
 *  - a left list + right detail pane
 *  - accept/decline live in the detail pane
 *
 * Fields referenced on each item: id, orgName, message, campaignBrief, status.
 * (Budget / format / plazo facts shown in the HTML mock are illustrative —
 *  wire them up only if your contact schema carries them.)
 */

type Status = 'pending' | 'accepted' | 'declined';

const STATUS: Record<Status, { label: string; color: 'gray' | 'green' | 'red' | 'yellow' }> = {
  pending: { label: es.contact.pending, color: 'yellow' },
  accepted: { label: es.contact.accepted, color: 'green' },
  declined: { label: es.contact.declined, color: 'red' },
};

type Tab = 'todas' | 'nuevas' | 'aceptadas';

export default function ContactsInboxPage() {
  const utils = trpc.useUtils();
  const list = trpc.contact.listForCreator.useQuery(undefined, { retry: false });
  const update = trpc.contact.updateStatus.useMutation({
    onSuccess: () => utils.contact.listForCreator.invalidate(),
  });

  const [tab, setTab] = useState<Tab>('todas');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const items = list.data ?? [];
  const counts = {
    todas: items.length,
    nuevas: items.filter((c) => c.status === 'pending').length,
    aceptadas: items.filter((c) => c.status === 'accepted').length,
  };
  const visible =
    tab === 'nuevas'
      ? items.filter((c) => c.status === 'pending')
      : tab === 'aceptadas'
        ? items.filter((c) => c.status === 'accepted')
        : items;

  const selected = visible.find((c) => c.id === selectedId) ?? visible[0] ?? null;

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: 'todas', label: 'Todas', count: counts.todas },
    { key: 'nuevas', label: 'Nuevas', count: counts.nuevas },
    { key: 'aceptadas', label: 'Aceptadas', count: counts.aceptadas },
  ];

  return (
    <>
      <AppHeader />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="mb-1 text-2xl font-bold tracking-tight text-ink">{es.contact.inbox}</h1>
        <p className="mb-5 text-sm text-muted">Marcas y agencias que quieren colaborar con vos.</p>

        {/* filter tabs */}
        <div className="mb-4 flex gap-1.5">
          {tabs.map((t) => {
            const on = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={
                  'inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-[13px] font-semibold transition-colors ' +
                  (on ? 'border-ink bg-ink text-white' : 'border-line bg-surface text-ink-soft hover:bg-line-soft')
                }
              >
                {t.label}
                {t.count > 0 && (
                  <span
                    className={
                      'min-w-[18px] rounded-full px-1.5 text-center text-[11px] ' +
                      (on ? 'bg-white/20 text-white' : 'bg-accent-soft text-accent-soft-fg')
                    }
                  >
                    {t.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {list.isLoading ? (
          <div className="flex justify-center py-16">
            <Spinner />
          </div>
        ) : items.length === 0 ? (
          <EmptyState title={es.contact.empty} />
        ) : (
          <div className="grid items-start gap-5 lg:grid-cols-[360px_1fr]">
            {/* list */}
            <div className="overflow-hidden rounded-card border border-line bg-surface shadow-card">
              {visible.map((c) => {
                const s = STATUS[(c.status as Status) ?? 'pending'];
                const isSel = selected?.id === c.id;
                const isNew = c.status === 'pending';
                return (
                  <button
                    key={c.id}
                    onClick={() => setSelectedId(c.id)}
                    className={
                      'flex w-full gap-3 border-b border-line-soft p-4 text-left transition-colors ' +
                      (isSel ? 'bg-accent-soft/40' : 'hover:bg-line-soft')
                    }
                    style={{ borderLeft: `3px solid ${isSel ? 'var(--color-accent)' : 'transparent'}` }}
                  >
                    <span className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-ink text-sm font-bold text-white">
                      {c.orgName.slice(0, 1).toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className={'truncate text-sm ' + (isNew ? 'font-bold text-ink' : 'font-medium text-ink')}>
                          {c.orgName}
                        </span>
                      </div>
                      <p className="mt-0.5 truncate text-[13px] text-muted">{c.message}</p>
                      <div className="mt-1.5">
                        <Badge color={s.color}>{s.label}</Badge>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* detail */}
            {selected && (
              <div className="overflow-hidden rounded-card border border-line bg-surface shadow-card">
                <div className="flex items-center gap-3 border-b border-line-soft px-6 py-5">
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-ink text-lg font-bold text-white">
                    {selected.orgName.slice(0, 1).toUpperCase()}
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-bold text-ink">{selected.orgName}</h2>
                      <Badge color={STATUS[(selected.status as Status) ?? 'pending'].color}>
                        {STATUS[(selected.status as Status) ?? 'pending'].label}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="px-6 py-6">
                  <div className="mb-2 text-[13px] font-semibold text-ink-soft">{es.contact.message}</div>
                  <p className="text-[15px] leading-relaxed text-ink-soft">{selected.message}</p>

                  {selected.campaignBrief && (
                    <>
                      <div className="mt-5 mb-2 text-[13px] font-semibold text-ink-soft">{es.contact.brief}</div>
                      <p className="rounded-xl bg-line-soft p-4 text-sm text-ink-soft">{selected.campaignBrief}</p>
                    </>
                  )}

                  {selected.status === 'pending' ? (
                    <div className="mt-6 flex items-center gap-2.5 border-t border-line-soft pt-5">
                      <button
                        onClick={() => update.mutate({ contactId: selected.id, status: 'accepted' })}
                        disabled={update.isPending}
                        className="rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-accent-fg shadow-sm transition-all hover:bg-accent-strong active:scale-[.98] disabled:opacity-40"
                      >
                        {es.contact.accept}
                      </button>
                      <button
                        onClick={() => update.mutate({ contactId: selected.id, status: 'declined' })}
                        disabled={update.isPending}
                        className="ml-auto rounded-lg px-4 py-2.5 text-sm font-semibold text-rose-600 transition-colors hover:bg-rose-50 disabled:opacity-40"
                      >
                        {es.contact.decline}
                      </button>
                    </div>
                  ) : selected.status === 'accepted' ? (
                    <div className="mt-6 flex items-center gap-3 rounded-xl bg-accent-soft p-4">
                      <span className="text-lg">🤝</span>
                      <p className="text-sm leading-snug text-accent-soft-fg">
                        <strong>{es.contact.accepted}.</strong> Compartimos tu contacto con {selected.orgName}.
                      </p>
                    </div>
                  ) : null}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </>
  );
}
