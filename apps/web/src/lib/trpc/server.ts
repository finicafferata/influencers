import 'server-only';
import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
import type { AppRouter } from '@repo/trpc';

export const serverTrpc = createTRPCProxyClient<AppRouter>({
  links: [
    httpBatchLink({
      url: `${process.env.API_URL ?? 'http://localhost:3001'}/trpc`,
    }),
  ],
});
