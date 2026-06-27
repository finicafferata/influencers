import { initTRPC, TRPCError } from '@trpc/server';
import type { PrismaClientExtended } from '@repo/db';
import { CAPABILITY_SET, type Capability } from './constants';
import { FEATURES, type FeatureName } from './flags';
import type { LlmClient } from './llm';

export type Context = {
  /** Set by the server adapter after verifying the session JWT. */
  userId?: string;
  /** Caller IP (best-effort, from x-forwarded-for) for anonymous rate limits. */
  ip?: string;
  db: PrismaClientExtended;
  /** Optional LLM client (undefined when no key configured → heuristic fallback). */
  llm?: LlmClient;
};

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const middleware = t.middleware;
export const publicProcedure = t.procedure;

/**
 * Lightweight in-memory fixed-window rate limiter. tRPC routes are served by a
 * Nest middleware, so the global ThrottlerGuard does NOT apply to them
 * (REVIEW-01 / Bug 2) — this fills that gap for sensitive procedures.
 * NOTE: in-memory = per-instance; replace with a shared store (Redis) when the
 * API runs multi-instance.
 */
const rateBuckets = new Map<string, { count: number; reset: number }>();
export function rateLimit(opts: { key: string; limit: number; windowMs: number }) {
  return middleware(async ({ ctx, next }) => {
    const who = ctx.userId ?? ctx.ip ?? 'anon';
    const bucketKey = `${opts.key}:${who}`;
    const now = Date.now();
    const bucket = rateBuckets.get(bucketKey);
    if (!bucket || now > bucket.reset) {
      rateBuckets.set(bucketKey, { count: 1, reset: now + opts.windowMs });
    } else {
      bucket.count += 1;
      if (bucket.count > opts.limit) {
        throw new TRPCError({ code: 'TOO_MANY_REQUESTS', message: 'Demasiadas solicitudes, probá más tarde' });
      }
    }
    return next();
  });
}

/**
 * Gate a procedure behind a feature flag. When the flag is OFF the procedure
 * is unreachable (NOT_FOUND), so a flagged-off surface can't be driven even by
 * a hand-crafted request — not just hidden in the UI. See ./flags.ts.
 */
export function requireFeature(name: FeatureName) {
  return middleware(async ({ next }) => {
    if (!FEATURES[name]) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Función no disponible' });
    }
    return next();
  });
}

/**
 * Authenticated. Loads the user, and — because the 7-day JWT has no
 * revocation list — rejects suspended users here (REVIEW-01 C4).
 */
export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.userId) throw new TRPCError({ code: 'UNAUTHORIZED' });
  const user = await ctx.db.user.findUnique({ where: { id: ctx.userId } });
  if (!user) throw new TRPCError({ code: 'UNAUTHORIZED' });
  if (user.suspended) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Cuenta suspendida' });
  }
  return next({ ctx: { ...ctx, userId: user.id, user } });
});

/** Authenticated + owns a creator profile. Attaches creatorId. */
export const creatorProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  const profile = await ctx.db.creatorProfile.findUnique({
    where: { userId: ctx.userId },
    select: { id: true },
  });
  if (!profile) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Requiere perfil de creador' });
  }
  return next({ ctx: { ...ctx, creatorId: profile.id } });
});

/**
 * Authenticated + member of an org holding `capability`. Attaches the
 * matching orgId and the caller's capabilities. Capability is validated
 * against the shared constant so a typo fails loudly, not silently (C7).
 */
export function orgProcedure(capability: Capability) {
  if (!CAPABILITY_SET.has(capability)) {
    throw new Error(`Unknown capability: ${capability}`);
  }
  return protectedProcedure.use(async ({ ctx, next }) => {
    const memberships = await ctx.db.organizationMember.findMany({
      where: { userId: ctx.userId },
      include: { org: { select: { id: true, capabilities: true } } },
    });
    const match = memberships.find((m) => m.org.capabilities.includes(capability));
    if (!match) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: `Requiere la capacidad ${capability}`,
      });
    }
    return next({
      ctx: { ...ctx, orgId: match.orgId, capabilities: match.org.capabilities },
    });
  });
}

/** Authenticated + platform admin. */
export const adminProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  if (!ctx.user.isAdmin) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Requiere admin' });
  }
  return next({ ctx });
});
