import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';

export const notificationRouter = router({
  list: protectedProcedure
    .input(z.object({ cursor: z.string().optional(), limit: z.number().int().min(1).max(50).default(20) }).optional())
    .query(async ({ ctx, input }) => {
      const limit = input?.limit ?? 20;
      const rows = await ctx.db.notification.findMany({
        where: { userId: ctx.userId },
        // Unread first, then newest. id tiebreaker keeps the cursor stable.
        orderBy: [{ read: 'asc' }, { createdAt: 'desc' }, { id: 'desc' }],
        take: limit + 1,
        ...(input?.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
      });
      const hasMore = rows.length > limit;
      const page = hasMore ? rows.slice(0, limit) : rows;
      return { items: page, nextCursor: hasMore ? page[page.length - 1].id : null };
    }),

  unreadCount: protectedProcedure.query(async ({ ctx }) => {
    const count = await ctx.db.notification.count({
      where: { userId: ctx.userId, read: false },
    });
    return { count };
  }),

  markRead: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Scope to owner so one user can't flip another's notification.
      const result = await ctx.db.notification.updateMany({
        where: { id: input.id, userId: ctx.userId },
        data: { read: true },
      });
      return { updated: result.count };
    }),

  markAllRead: protectedProcedure.mutation(async ({ ctx }) => {
    const result = await ctx.db.notification.updateMany({
      where: { userId: ctx.userId, read: false },
      data: { read: true },
    });
    return { updated: result.count };
  }),
});
