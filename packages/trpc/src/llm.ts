import type { ContentType } from './constants';

/** Structured campaign criteria parsed from a free-text brief. */
export interface ParsedCriteria {
  niches: string[];
  country?: string;
  platform?: string;
  followersMin?: number;
  followersMax?: number;
  engagementMin?: number;
  contentType?: ContentType;
  /** Dominant AUDIENCE country the campaign targets (not creator location). */
  audienceCountry?: string;
  budget?: number;
}

export interface RationaleInput {
  brief: string;
  creators: { id: string; facts: string }[];
}

/**
 * Provider-agnostic LLM contract. The trpc package depends on this interface
 * only; the concrete implementation (with the SDK + API key) lives server-side
 * in apps/api and is injected into the tRPC context. When no key is
 * configured, `enabled` is false and procedures take a heuristic fallback.
 */
export interface LlmClient {
  readonly enabled: boolean;
  /** Parse a free-text brief into structured criteria (validated by the caller). */
  parseBrief(text: string): Promise<ParsedCriteria>;
  /** One batched call → { creatorId: "una línea de por qué encaja" } (≤140 chars, es). */
  rationales(input: RationaleInput): Promise<Record<string, string>>;
}
