import type { PrismaClientExtended } from '@repo/db';

/** Funnel stages we instrument for launch validation. */
export type FunnelEventType =
  | 'profile_published'
  | 'search_performed'
  | 'contact_sent'
  | 'contact_responded';

export interface EventData {
  userId?: string;
  orgId?: string;
  creatorId?: string;
  meta?: Record<string, unknown>;
}

/**
 * Fire-and-forget funnel event recorder. NEVER throws and NEVER blocks the
 * request — analytics must not be able to break a user action. Callers may
 * `void recordEvent(...)` without awaiting.
 */
export async function recordEvent(
  db: PrismaClientExtended,
  type: FunnelEventType,
  data: EventData = {},
): Promise<void> {
  try {
    await db.analyticsEvent.create({
      data: {
        type,
        userId: data.userId ?? null,
        orgId: data.orgId ?? null,
        creatorId: data.creatorId ?? null,
        meta: (data.meta ?? undefined) as never,
      },
    });
  } catch {
    // swallow — instrumentation is best-effort
  }
}
