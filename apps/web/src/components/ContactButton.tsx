'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc/client';
import { useBootstrap } from '@/lib/useBootstrap';
import { Button, Modal, Textarea, Field } from '@/components/ui';
import { es } from '@/lib/i18n';

export function ContactButton({ creatorId }: { creatorId: string }) {
  const { data } = useBootstrap();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [brief, setBrief] = useState('');
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const send = trpc.contact.send.useMutation();

  const canSearch = data?.orgs.some((o) => o.capabilities.includes('can_search_creators'));
  if (!canSearch) return null;

  async function submit() {
    setError(null);
    try {
      await send.mutateAsync({ toCreatorId: creatorId, message, campaignBrief: brief || undefined });
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : es.common.error);
    }
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>{es.search.contact}</Button>
      <Modal open={open} onClose={() => { setOpen(false); setDone(false); }} title={es.contact.title}>
        {done ? (
          <div className="text-center">
            <p className="mb-4 text-green-600">{es.contact.sent}</p>
            <Button variant="secondary" onClick={() => { setOpen(false); setDone(false); }}>{es.common.cancel}</Button>
          </div>
        ) : (
          <>
            <Field label={es.contact.message}>
              <Textarea rows={3} value={message} onChange={(e) => setMessage(e.target.value)} maxLength={2000} />
            </Field>
            <Field label={es.contact.brief} hint={es.common.optional}>
              <Textarea rows={4} value={brief} onChange={(e) => setBrief(e.target.value)} maxLength={4000} />
            </Field>
            {error && <p className="mb-2 text-sm text-red-600">{error}</p>}
            <div className="flex justify-end">
              <Button variant="accent" onClick={submit} disabled={send.isPending || message.trim().length === 0}>
                {send.isPending ? es.common.saving : es.contact.send}
              </Button>
            </div>
          </>
        )}
      </Modal>
    </>
  );
}
