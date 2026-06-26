import { PrismaClient } from '@prisma/client';
import { recomputeCreatorAggregates } from './aggregates';

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createPrismaClient>;
};

function createPrismaClient() {
  const base = new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
  });

  // Single write path for the denormalized aggregates: any single-record
  // create/update/delete/upsert on SocialAccount recomputes the owning
  // profile's maxFollowers / maxEngagement. Covers routers, admin, and seed.
  return base.$extends({
    query: {
      socialAccount: {
        async create({ args, query }) {
          const result = await query(args);
          await recomputeCreatorAggregates(base, (result as { creatorId: string }).creatorId);
          return result;
        },
        async update({ args, query }) {
          const result = await query(args);
          await recomputeCreatorAggregates(base, (result as { creatorId: string }).creatorId);
          return result;
        },
        async delete({ args, query }) {
          const result = await query(args);
          await recomputeCreatorAggregates(base, (result as { creatorId: string }).creatorId);
          return result;
        },
        async upsert({ args, query }) {
          const result = await query(args);
          await recomputeCreatorAggregates(base, (result as { creatorId: string }).creatorId);
          return result;
        },
      },
    },
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// The extended client type — use this where a typed client instance is needed.
export type PrismaClientExtended = ReturnType<typeof createPrismaClient>;

export { PrismaClient };
export { recomputeCreatorAggregates } from './aggregates';
export * from '@prisma/client';
