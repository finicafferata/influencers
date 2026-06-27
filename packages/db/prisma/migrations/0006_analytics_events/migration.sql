-- Funnel/analytics event log for launch validation
-- (publish → search → contact → response). FK-free, append-only. Additive.

CREATE TABLE IF NOT EXISTS "AnalyticsEvent" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "userId" TEXT,
    "orgId" TEXT,
    "creatorId" TEXT,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnalyticsEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "AnalyticsEvent_type_createdAt_idx" ON "AnalyticsEvent"("type", "createdAt");
CREATE INDEX IF NOT EXISTS "AnalyticsEvent_createdAt_idx" ON "AnalyticsEvent"("createdAt");
