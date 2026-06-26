import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import {
  SLICE1_ORG_DISPLAY_TYPES,
  capabilitiesForDisplayType,
  type OrgDisplayType,
} from '../constants';

// Slice 1 only onboards demand-side orgs (brand / marketing_agency). talent /
// hybrid wait for the roster epic, so we don't let users onboard into an
// unservable role (REVIEW-01 D1).
const slice1DisplayType = z.enum(
  SLICE1_ORG_DISPLAY_TYPES as [OrgDisplayType, ...OrgDisplayType[]],
);

export const orgRouter = router({
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().trim().min(2).max(120),
        displayType: slice1DisplayType,
        // Capabilities are derived server-side from displayType — never
        // client-supplied (prevents self-granting; REVIEW-01 D2).
        country: z.string().max(2).optional(),
        logo: z.string().url().optional(),
        website: z.string().url().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const capabilities = capabilitiesForDisplayType(input.displayType);

      const org = await ctx.db.organization.create({
        data: {
          name: input.name,
          displayType: input.displayType,
          capabilities,
          country: input.country,
          logo: input.logo,
          website: input.website,
          members: { create: { userId: ctx.userId!, role: 'owner' } },
        },
        include: { members: true },
      });
      const membership = org.members.find((m) => m.userId === ctx.userId)!;
      return { org, membership };
    }),

  getMine: protectedProcedure.query(async ({ ctx }) => {
    const memberships = await ctx.db.organizationMember.findMany({
      where: { userId: ctx.userId },
      include: { org: true },
    });
    return memberships.map((m) => ({
      id: m.org.id,
      name: m.org.name,
      displayType: m.org.displayType,
      capabilities: m.org.capabilities,
      country: m.org.country,
      logo: m.org.logo,
      website: m.org.website,
      role: m.role,
    }));
  }),
});
