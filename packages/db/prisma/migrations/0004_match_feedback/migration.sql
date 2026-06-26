-- AI Brief-to-Match — MatchFeedback (per-org feedback). Additive.

CREATE TABLE IF NOT EXISTS "MatchFeedback" (
  "id"        TEXT NOT NULL,
  "orgId"     TEXT NOT NULL,
  "userId"    TEXT NOT NULL,
  "creatorId" TEXT NOT NULL,
  "vote"      TEXT NOT NULL,
  "briefText" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MatchFeedback_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "MatchFeedback_orgId_creatorId_key" ON "MatchFeedback"("orgId", "creatorId");
CREATE INDEX IF NOT EXISTS "MatchFeedback_orgId_idx" ON "MatchFeedback"("orgId");
CREATE INDEX IF NOT EXISTS "MatchFeedback_creatorId_idx" ON "MatchFeedback"("creatorId");

ALTER TABLE "MatchFeedback" ADD CONSTRAINT "MatchFeedback_orgId_fkey"
  FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MatchFeedback" ADD CONSTRAINT "MatchFeedback_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MatchFeedback" ADD CONSTRAINT "MatchFeedback_creatorId_fkey"
  FOREIGN KEY ("creatorId") REFERENCES "CreatorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
