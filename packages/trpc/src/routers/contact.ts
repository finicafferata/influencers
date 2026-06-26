import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, orgProcedure, creatorProcedure, rateLimit } from '../trpc';

function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code?: string }).code === 'P2002'
  );
}

export const contactRouter = router({
  /**
   * Org → creator structured contact. The Contact + its Notification are
   * created atomically; the partial-unique index enforces "one pending
   * contact per (sender, creator)" — we catch the violation as CONFLICT.
   */
  send: orgProcedure('can_search_creators')
    .use(rateLimit({ key: 'contact.send', limit: 20, windowMs: 60_000 }))
    .input(
      z.object({
        toCreatorId: z.string(),
        message: z.string().trim().min(1).max(2000),
        campaignBrief: z.string().trim().max(4000).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const creator = await ctx.db.creatorProfile.findUnique({
        where: { id: input.toCreatorId },
        select: { id: true, userId: true, published: true },
      });
      if (!creator || !creator.published) throw new TRPCError({ code: 'NOT_FOUND' });

      const org = await ctx.db.organization.findUnique({
        where: { id: ctx.orgId },
        select: { name: true },
      });
      const orgName = org?.name ?? 'Una marca';

      try {
        return await ctx.db.$transaction(async (tx) => {
          const contact = await tx.contact.create({
            data: {
              fromUserId: ctx.userId!,
              toCreatorId: creator.id,
              orgName,
              message: input.message,
              campaignBrief: input.campaignBrief,
              status: 'pending',
            },
          });
          await tx.notification.create({
            data: {
              userId: creator.userId,
              type: 'contact',
              title: `${orgName} quiere contactarte`,
              body: input.message.slice(0, 140),
              link: '/dashboard/contacts',
            },
          });
          return contact;
        });
      } catch (err) {
        if (isUniqueViolation(err)) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'Ya tenés una solicitud pendiente con este creador',
          });
        }
        throw err;
      }
    }),

  listForCreator: creatorProcedure.query(async ({ ctx }) => {
    return ctx.db.contact.findMany({
      where: { toCreatorId: ctx.creatorId },
      orderBy: { createdAt: 'desc' },
    });
  }),

  updateStatus: creatorProcedure
    .input(z.object({ contactId: z.string(), status: z.enum(['accepted', 'declined']) }))
    .mutation(async ({ ctx, input }) => {
      const contact = await ctx.db.contact.findUnique({
        where: { id: input.contactId },
        select: { id: true, toCreatorId: true, status: true, fromUserId: true, orgName: true },
      });
      // Ownership: must be the recipient creator (REVIEW-01 C6).
      if (!contact || contact.toCreatorId !== ctx.creatorId) {
        throw new TRPCError({ code: 'NOT_FOUND' });
      }
      if (contact.status !== 'pending') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'La solicitud ya fue resuelta' });
      }

      return ctx.db.$transaction(async (tx) => {
        const updated = await tx.contact.update({
          where: { id: contact.id },
          data: { status: input.status },
        });
        // Notify the sender of the outcome.
        await tx.notification.create({
          data: {
            userId: contact.fromUserId,
            type: 'contact_status',
            title:
              input.status === 'accepted'
                ? 'Tu solicitud fue aceptada'
                : 'Tu solicitud fue rechazada',
            link: '/search',
          },
        });
        return updated;
      });
    }),

  /** Creators this caller has already contacted — powers the "Contactado" state. */
  listSentByOrg: orgProcedure('can_search_creators').query(async ({ ctx }) => {
    const sent = await ctx.db.contact.findMany({
      where: { fromUserId: ctx.userId },
      select: { toCreatorId: true, status: true },
    });
    return sent;
  }),
});
