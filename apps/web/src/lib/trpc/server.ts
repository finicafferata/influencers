import 'server-only';
import { cookies } from 'next/headers';
import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
import type { AppRouter } from '@repo/trpc';

const API_URL = process.env.API_URL ?? 'http://localhost:3001';

// Server-side tRPC caller for Server Components. Forwards the session cookie so
// authenticated SSR queries (e.g. me.bootstrap, draft profile preview) work.
export async function getServerTrpc() {
  const cookieStore = await cookies();
  const session = cookieStore.get('session')?.value;
  return createTRPCProxyClient<AppRouter>({
    links: [
      httpBatchLink({
        url: `${API_URL}/trpc`,
        headers() {
          return session ? { cookie: `session=${session}` } : {};
        },
      }),
    ],
  });
}
