-- EPIC-1 / TASK-02 — additive schema deltas + search-supporting indexes.
-- NOTE: The column additions below mirror schema.prisma. If you run
-- `prisma migrate dev` against the updated schema, Prisma generates the
-- column/btree-index statements itself; in that case keep ONLY the
-- "raw index" section at the bottom (GIN, trigram, partial-unique), which
-- Prisma cannot express, and delete the column/index statements it duplicates.

-- ── Column additions ──────────────────────────────────────────────────────
ALTER TABLE "CreatorProfile" ADD COLUMN IF NOT EXISTS "headline" TEXT;
ALTER TABLE "CreatorProfile" ADD COLUMN IF NOT EXISTS "tags" TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE "CreatorProfile" ADD COLUMN IF NOT EXISTS "published" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "CreatorProfile" ADD COLUMN IF NOT EXISTS "maxFollowers" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "CreatorProfile" ADD COLUMN IF NOT EXISTS "maxEngagement" DOUBLE PRECISION NOT NULL DEFAULT 0;

ALTER TABLE "SocialAccount" ADD COLUMN IF NOT EXISTS "verified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "SocialAccount" ADD COLUMN IF NOT EXISTS "verificationSource" TEXT;
ALTER TABLE "SocialAccount" ADD COLUMN IF NOT EXISTS "verifiedAt" TIMESTAMP(3);

-- ── B-tree indexes (also expressible in schema.prisma via @@index) ──────────
CREATE INDEX IF NOT EXISTS "CreatorProfile_country_idx" ON "CreatorProfile"("country");
CREATE INDEX IF NOT EXISTS "CreatorProfile_contentType_idx" ON "CreatorProfile"("contentType");
CREATE INDEX IF NOT EXISTS "CreatorProfile_published_idx" ON "CreatorProfile"("published");
CREATE INDEX IF NOT EXISTS "CreatorProfile_maxFollowers_idx" ON "CreatorProfile"("maxFollowers");
CREATE INDEX IF NOT EXISTS "CreatorProfile_maxEngagement_idx" ON "CreatorProfile"("maxEngagement");

-- ── Raw indexes Prisma cannot express ───────────────────────────────────────
-- Array containment (hasSome) acceleration for niches/tags
CREATE INDEX IF NOT EXISTS "CreatorProfile_niches_gin" ON "CreatorProfile" USING GIN ("niches");
CREATE INDEX IF NOT EXISTS "CreatorProfile_tags_gin" ON "CreatorProfile" USING GIN ("tags");

-- Trigram free-text search on headline + username (search `q`)
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS "CreatorProfile_headline_trgm" ON "CreatorProfile" USING GIN ("headline" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "CreatorProfile_username_trgm" ON "CreatorProfile" USING GIN ("username" gin_trgm_ops);

-- DB-level contact dedupe: at most one PENDING contact per (sender, creator)
CREATE UNIQUE INDEX IF NOT EXISTS "Contact_pending_unique"
  ON "Contact"("fromUserId", "toCreatorId")
  WHERE "status" = 'pending';
