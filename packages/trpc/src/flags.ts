/**
 * Server-side feature flags (read once at module load from the API process env).
 *
 * v1 launch surface is deliberately narrow: publish profile → search/filter →
 * creator card → structured contact → notify → accept, PLUS media-kit. AI match
 * and audience data are built but flagged OFF until the core loop is validated.
 *
 *   FEATURE_AI_MATCH=on        enable the brief→match router (default OFF)
 *   FEATURE_AUDIENCE_DATA=on   enable self-declared audience demographics (default OFF)
 *   FEATURE_MEDIA_KIT=off      disable media-kit (default ON)
 *
 * Keep these defaults in sync with the web client flags (apps/web/src/lib/flags.ts).
 */
export const FEATURES = {
  aiMatch: process.env.FEATURE_AI_MATCH === 'on',
  audienceData: process.env.FEATURE_AUDIENCE_DATA === 'on',
  mediaKit: process.env.FEATURE_MEDIA_KIT !== 'off',
} as const;

export type FeatureName = keyof typeof FEATURES;
