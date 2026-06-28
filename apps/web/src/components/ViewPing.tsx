'use client';

import { useEffect } from 'react';
import { trpc } from '@/lib/trpc/client';

/**
 * Records a media-kit view once per browser session (best-effort dedupe).
 * Owner-exclusion is enforced server-side in creator.recordView.
 */
export function ViewPing({ username }: { username: string }) {
  const record = trpc.creator.recordView.useMutation();

  useEffect(() => {
    const key = `ck_viewed_${username}`;
    if (typeof window === 'undefined') return;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, '1');
    record.mutate({ username });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username]);

  return null;
}
