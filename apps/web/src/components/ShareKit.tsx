'use client';

import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Button, Modal } from '@/components/ui';

export function ShareKit({ username, variant = 'button' }: { username: string; variant?: 'button' | 'card' }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const url =
    typeof window !== 'undefined' ? `${window.location.origin}/c/${username}` : `/c/${username}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  }

  async function nativeShare() {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title: `@${username} · CreatorLink`, url });
      } catch {
        /* user cancelled */
      }
    } else {
      void copy();
    }
  }

  return (
    <>
      {variant === 'button' ? (
        <Button variant="secondary" onClick={() => setOpen(true)}>Compartir</Button>
      ) : (
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="font-bold text-gray-900">Compartí tu media kit</h2>
          <p className="mt-1 text-sm text-gray-600">Mandá este link a marcas por WhatsApp, Instagram o email.</p>
          <div className="mt-3 flex items-center gap-2">
            <code className="flex-1 truncate rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-700">{url}</code>
            <Button size="sm" onClick={copy}>{copied ? '¡Copiado!' : 'Copiar'}</Button>
            <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>QR</Button>
          </div>
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Compartir media kit">
        <div className="flex flex-col items-center gap-4">
          <div className="rounded-xl bg-white p-3 shadow-sm">
            <QRCodeSVG value={url} size={180} />
          </div>
          <code className="w-full truncate rounded-lg bg-gray-50 px-3 py-2 text-center text-sm text-gray-700">{url}</code>
          <div className="flex gap-2">
            <Button onClick={copy}>{copied ? '¡Copiado!' : 'Copiar link'}</Button>
            <Button variant="secondary" onClick={nativeShare}>Compartir…</Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
