import { initTRPC, TRPCError } from '@trpc/server';
import type { PrismaClient } from '@repo/db';

export type Context = {
  userId?: string;
  db: PrismaClient;
};

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.userId) throw new TRPCError({ code: 'UNAUTHORIZED' });
  return next({ ctx: { userId: ctx.userId, db: ctx.db } });
});
