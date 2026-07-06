'use client';

import { trpc } from '@/lib/trpc/client';

/**
 * Current user + resolved role. The single client-side routing authority
 * (mirrors me.bootstrap). Returns role 'none' for users without a role yet.
 */
export function useBootstrap() {
  const query = trpc.me.bootstrap.useQuery(undefined, {
    retry: false,
    staleTime: 30_000,
  });
  return {
    ...query,
    isAuthed: !query.isError && !!query.data,
    role: query.data?.role,
  };
}

export async function logout() {
  await fetch('/api/auth/logout', { method: 'POST' });
  window.location.href = '/';
}
