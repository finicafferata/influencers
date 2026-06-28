import { router, protectedProcedure } from '../trpc';

export type Role = 'admin' | 'creator' | 'org_member' | 'none';

export const meRouter = router({
  /**
   * Single source of truth for post-login routing (REVIEW-01 C2 — replaces
   * the removed `isNewUser` heuristic). Clients route on `role`.
   */
  bootstrap: protectedProcedure.query(async ({ ctx }) => {
    const user = ctx.user;

    const [creatorProfile, memberships] = await Promise.all([
      ctx.db.creatorProfile.findUnique({
        where: { userId: user.id },
        select: { id: true, username: true, published: true },
      }),
      ctx.db.organizationMember.findMany({
        where: { userId: user.id },
        include: { org: { select: { id: true, name: true, capabilities: true } } },
      }),
    ]);

    const orgs = memberships.map((m) => ({
      id: m.org.id,
      name: m.org.name,
      capabilities: m.org.capabilities,
      role: m.role,
    }));

    let role: Role = 'none';
    if (user.isAdmin) role = 'admin';
    else if (creatorProfile) role = 'creator';
    else if (orgs.length > 0) role = 'org_member';

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        isAdmin: user.isAdmin,
      },
      role,
      creatorProfile,
      orgs,
    };
  }),
});
