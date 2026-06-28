/**
 * Client-side feature flags. Inlined at build time from NEXT_PUBLIC_* env vars.
 *
 * v1 launch surface is deliberately narrow: publish profile → search/filter →
 * creator card → structured contact → notify → accept, PLUS media-kit. AI match
 * and audience data are built but flagged OFF until the core loop is validated.
 *
 *   NEXT_PUBLIC_FEATURE_AI_MATCH=on        show AI brief→match (default OFF)
 *   NEXT_PUBLIC_FEATURE_AUDIENCE_DATA=on   show audience demographics (default OFF)
 *   NEXT_PUBLIC_FEATURE_MEDIA_KIT=off      hide media-kit (default ON)
 *
 * Keep these defaults in sync with the server flags (packages/trpc/src/flags.ts).
 */
export const features = {
  aiMatch: process.env.NEXT_PUBLIC_FEATURE_AI_MATCH === 'on',
  audienceData: process.env.NEXT_PUBLIC_FEATURE_AUDIENCE_DATA === 'on',
  mediaKit: process.env.NEXT_PUBLIC_FEATURE_MEDIA_KIT !== 'off',
} as const;
