// Shared controlled vocabularies and enums. Slugs are stable (English);
// labelEs is what the Spanish-first UI renders. Adding/renaming a niche is a
// deploy — acceptable for MVP (see REVIEW-01 / TASK-02).

export const NICHES = [
  { slug: 'beauty', labelEs: 'Belleza' },
  { slug: 'fashion', labelEs: 'Moda' },
  { slug: 'lifestyle', labelEs: 'Lifestyle' },
  { slug: 'fitness', labelEs: 'Fitness' },
  { slug: 'wellness', labelEs: 'Bienestar' },
  { slug: 'food', labelEs: 'Gastronomía' },
  { slug: 'travel', labelEs: 'Viajes' },
  { slug: 'tech', labelEs: 'Tecnología' },
  { slug: 'gaming', labelEs: 'Gaming' },
  { slug: 'parenting', labelEs: 'Maternidad y paternidad' },
  { slug: 'home', labelEs: 'Hogar y decoración' },
  { slug: 'business', labelEs: 'Negocios y emprendimiento' },
  { slug: 'finance', labelEs: 'Finanzas personales' },
  { slug: 'education', labelEs: 'Educación' },
  { slug: 'entertainment', labelEs: 'Entretenimiento' },
  { slug: 'music', labelEs: 'Música' },
  { slug: 'sports', labelEs: 'Deportes' },
  { slug: 'pets', labelEs: 'Mascotas' },
  { slug: 'art', labelEs: 'Arte y diseño' },
  { slug: 'sustainability', labelEs: 'Sostenibilidad' },
] as const;

export type NicheSlug = (typeof NICHES)[number]['slug'];

export const NICHE_SLUGS: ReadonlySet<string> = new Set(NICHES.map((n) => n.slug));

const NICHE_LABELS: Record<string, string> = Object.fromEntries(
  NICHES.map((n) => [n.slug, n.labelEs]),
);

export function nicheLabel(slug: string): string {
  return NICHE_LABELS[slug] ?? slug;
}

export const PLATFORMS = [
  'instagram',
  'tiktok',
  'youtube',
  'twitch',
  'x',
  'other',
] as const;
export type Platform = (typeof PLATFORMS)[number];
export const PLATFORM_SET: ReadonlySet<string> = new Set(PLATFORMS);

export const CONTENT_TYPES = ['ugc', 'influencer', 'both'] as const;
export type ContentType = (typeof CONTENT_TYPES)[number];

export const PORTFOLIO_TYPES = ['image', 'video', 'link'] as const;
export type PortfolioType = (typeof PORTFOLIO_TYPES)[number];
export const PORTFOLIO_TYPE_SET: ReadonlySet<string> = new Set(PORTFOLIO_TYPES);

export const AGE_BANDS = ['13-17', '18-24', '25-34', '35-44', '45+'] as const;
export type AgeBand = (typeof AGE_BANDS)[number];
export const AGE_BAND_SET: ReadonlySet<string> = new Set(AGE_BANDS);

export const GENDERS = ['female', 'male', 'other'] as const;
export type Gender = (typeof GENDERS)[number];
export const GENDER_SET: ReadonlySet<string> = new Set(GENDERS);
export const GENDER_LABELS: Record<string, string> = { female: 'Mujeres', male: 'Hombres', other: 'Otro' };

export const CAPABILITIES = ['can_search_creators', 'can_represent_creators'] as const;
export type Capability = (typeof CAPABILITIES)[number];
export const CAPABILITY_SET: ReadonlySet<string> = new Set(CAPABILITIES);

// Org display types. Only brand + marketing_agency onboard in Slice 1
// (both default to can_search_creators); talent/hybrid wait for the roster epic.
export const ORG_DISPLAY_TYPES = [
  'brand',
  'marketing_agency',
  'talent_agency',
  'hybrid',
] as const;
export type OrgDisplayType = (typeof ORG_DISPLAY_TYPES)[number];

export const SLICE1_ORG_DISPLAY_TYPES: OrgDisplayType[] = ['brand', 'marketing_agency'];

export function capabilitiesForDisplayType(displayType: OrgDisplayType): Capability[] {
  switch (displayType) {
    case 'brand':
    case 'marketing_agency':
      return ['can_search_creators'];
    case 'talent_agency':
      return ['can_represent_creators'];
    case 'hybrid':
      return ['can_search_creators', 'can_represent_creators'];
  }
}
