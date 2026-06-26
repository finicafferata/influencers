'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc/client';
import { es } from '@/lib/i18n';

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const utils = trpc.useUtils();
  const unread = trpc.notification.unreadCount.useQuery(undefined, {
    retry: false,
    refetchInterval: 60_000,
  });
  const list = trpc.notification.list.useQuery(undefined, { enabled: open, retry: false });
  const markAll = trpc.notification.markAllRead.useMutation({
    onSuccess: () => {
      utils.notification.unreadCount.invalidate();
      utils.notification.list.invalidate();
    },
  });

  const count = unread.data?.count ?? 0;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative rounded-full p-2 hover:bg-gray-100"
        aria-label={es.notifications.title}
      >
        <span aria-hidden>🔔</span>
        {count > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-xs font-bold text-white">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 rounded-xl border border-gray-200 bg-white shadow-lg">
          <div className="flex items-center justify-between border-b border-gray-100 p-3">
            <span className="font-semibold text-gray-900">{es.notifications.title}</span>
            {count > 0 && (
              <button onClick={() => markAll.mutate()} className="text-xs text-gray-500 hover:text-gray-800">
                {es.notifications.markAll}
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {(list.data?.items.length ?? 0) === 0 ? (
              <p className="p-4 text-center text-sm text-gray-500">{es.notifications.empty}</p>
            ) : (
              list.data!.items.map((n) => (
                <a
                  key={n.id}
                  href={n.link ?? '#'}
                  className={`block border-b border-gray-50 p-3 text-sm hover:bg-gray-50 ${n.read ? 'opacity-60' : ''}`}
                >
                  <div className="font-medium text-gray-900">{n.title}</div>
                  {n.body && <div className="text-gray-500">{n.body}</div>}
                </a>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
