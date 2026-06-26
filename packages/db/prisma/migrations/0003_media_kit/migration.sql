-- Media-Kit Phase 1 — additive deltas (mirror schema.prisma).
-- If running `prisma migrate dev` against the updated schema, Prisma generates
-- these itself; this file documents the changes and is safe to apply directly.

ALTER TABLE "CreatorProfile" ADD COLUMN IF NOT EXISTS "pitch" TEXT;
ALTER TABLE "CreatorProfile" ADD COLUMN IF NOT EXISTS "ratesPublic" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "CreatorProfile" ADD COLUMN IF NOT EXISTS "viewCount" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "PortfolioItem" ADD COLUMN IF NOT EXISTS "title" TEXT;
ALTER TABLE "PortfolioItem" ADD COLUMN IF NOT EXISTS "thumbnailUrl" TEXT;
