'use client';

import { trpc } from '@/lib/trpc/client';
import { AppHeader } from '@/components/AppHeader';
import { Badge, Button, Card, EmptyState, Spinner } from '@/components/ui';
import { es } from '@/lib/i18n';

const STATUS: Record<string, { label: string; color: 'gray' | 'green' | 'red' | 'yellow' }> = {
  pending: { label: es.contact.pending, color: 'yellow' },
  accepted: { label: es.contact.accepted, color: 'green' },
  declined: { label: es.contact.declined, color: 'red' },
};

export default function ContactsInboxPage() {
  const utils = trpc.useUtils();
  const list = trpc.contact.listForCreator.useQuery(undefined, { retry: false });
  const update = trpc.contact.updateStatus.useMutation({
    onSuccess: () => utils.contact.listForCreator.invalidate(),
  });

  return (
    <>
      <AppHeader />
      <main className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="mb-6 text-2xl font-bold text-gray-900">{es.contact.inbox}</h1>
        {list.isLoading ? (
          <div className="flex justify-center py-16"><Spinner /></div>
        ) : (list.data?.length ?? 0) === 0 ? (
          <EmptyState title={es.contact.empty} />
        ) : (
          <div className="space-y-3">
            {list.data!.map((c) => {
              const s = STATUS[c.status] ?? STATUS.pending;
              return (
                <Card key={c.id}>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-gray-900">{c.orgName}</span>
                    <Badge color={s.color}>{s.label}</Badge>
                  </div>
                  <p className="mt-2 text-sm text-gray-700">{c.message}</p>
                  {c.campaignBrief && (
                    <p className="mt-2 rounded-lg bg-gray-50 p-3 text-sm text-gray-600">{c.campaignBrief}</p>
                  )}
                  {c.status === 'pending' && (
                    <div className="mt-3 flex gap-2">
                      <Button size="sm" onClick={() => update.mutate({ contactId: c.id, status: 'accepted' })} disabled={update.isPending}>
                        {es.contact.accept}
                      </Button>
                      <Button size="sm" variant="secondary" onClick={() => update.mutate({ contactId: c.id, status: 'declined' })} disabled={update.isPending}>
                        {es.contact.decline}
                      </Button>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}
