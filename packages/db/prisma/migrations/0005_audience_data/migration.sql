-- Audience Data & Quality — per-account audience fields. Additive.

ALTER TABLE "SocialAccount" ADD COLUMN IF NOT EXISTS "audienceTopCountry" TEXT;
ALTER TABLE "SocialAccount" ADD COLUMN IF NOT EXISTS "audienceCountries" JSONB;
ALTER TABLE "SocialAccount" ADD COLUMN IF NOT EXISTS "audienceAges" JSONB;
ALTER TABLE "SocialAccount" ADD COLUMN IF NOT EXISTS "audienceGender" JSONB;
ALTER TABLE "SocialAccount" ADD COLUMN IF NOT EXISTS "audienceVerified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "SocialAccount" ADD COLUMN IF NOT EXISTS "audienceSource" TEXT;
ALTER TABLE "SocialAccount" ADD COLUMN IF NOT EXISTS "audienceVerifiedAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "SocialAccount_audienceTopCountry_idx" ON "SocialAccount"("audienceTopCountry");
