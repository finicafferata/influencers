import { z } from 'zod';
import { NICHE_SLUGS, PLATFORM_SET, CONTENT_TYPES, PORTFOLIO_TYPES } from './constants';

export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9_]{3,30}$/, {
    message: 'Usá 3–30 caracteres: letras minúsculas, números o guion bajo',
  });

export const nicheArraySchema = z
  .array(z.string())
  .max(10)
  .refine((arr) => arr.every((s) => NICHE_SLUGS.has(s)), {
    message: 'Nicho inválido',
  });

export const tagsSchema = z
  .array(z.string())
  .transform((arr) =>
    Array.from(
      new Set(
        arr
          .map((t) => t.trim().toLowerCase())
          .filter((t) => t.length > 0 && t.length <= 30),
      ),
    ).slice(0, 10),
  );

// currency defaults to USD so the parsed value has no `undefined` — keeps it
// assignable to Prisma's Json input type without casts.
export const ratesSchema = z.record(
  z.string(),
  z.object({
    from: z.number().nonnegative(),
    currency: z.string().length(3).default('USD'),
  }),
);

export const contentTypeSchema = z.enum(CONTENT_TYPES);

/** Editable profile fields. username handled separately (immutable once set). */
export const profileFieldsSchema = z.object({
  country: z.string().max(2).optional(),
  city: z.string().max(120).optional(),
  headline: z.string().max(80).optional(),
  pitch: z.string().max(280).optional(),
  bio: z.string().max(1000).optional(),
  contentType: contentTypeSchema.optional(),
  niches: nicheArraySchema.optional(),
  tags: tagsSchema.optional(),
  rates: ratesSchema.optional(),
  ratesPublic: z.boolean().optional(),
});

export const portfolioItemSchema = z.object({
  url: z.string().url().max(500),
  type: z.enum(PORTFOLIO_TYPES),
  title: z.string().max(120).optional(),
  thumbnailUrl: z.string().url().max(500).optional(),
});

export const socialAccountSchema = z.object({
  platform: z.string().refine((p) => PLATFORM_SET.has(p), { message: 'Plataforma inválida' }),
  handle: z.string().trim().min(1).max(60),
  followers: z.number().int().nonnegative(),
  engagementRate: z.number().min(0).max(100).optional(),
});
