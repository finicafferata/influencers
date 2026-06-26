import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import type { LlmClient, ParsedCriteria, RationaleInput } from '@repo/trpc';
import { NICHES } from '@repo/trpc';

/**
 * SDK-free LLM client over an OpenAI-compatible /chat/completions endpoint
 * (works with the cheapest hosted models or a local server). Reads:
 *   LLM_API_KEY   — required to enable; absent → enabled=false (heuristic path)
 *   LLM_BASE_URL  — default https://api.openai.com/v1
 *   LLM_MODEL     — default a cheap small model
 * Server-side only; the key never leaves the API.
 */
@Injectable()
export class LlmService implements LlmClient, OnModuleInit {
  private readonly logger = new Logger(LlmService.name);
  private apiKey: string | null = null;
  private baseUrl = 'https://api.openai.com/v1';
  private model = 'gpt-4o-mini';

  onModuleInit() {
    this.apiKey = process.env.LLM_API_KEY ?? null;
    if (process.env.LLM_BASE_URL) this.baseUrl = process.env.LLM_BASE_URL;
    if (process.env.LLM_MODEL) this.model = process.env.LLM_MODEL;
    if (!this.apiKey) {
      this.logger.warn(
        'LLM_API_KEY not set — AI match runs in heuristic mode (no LLM).',
      );
    }
  }

  get enabled(): boolean {
    return !!this.apiKey;
  }

  private async chat(
    system: string,
    user: string,
    maxTokens: number,
  ): Promise<string> {
    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: maxTokens,
        temperature: 0,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        response_format: { type: 'json_object' },
      }),
    });
    if (!res.ok) throw new Error(`LLM ${res.status}`);
    const json = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    return json.choices?.[0]?.message?.content ?? '{}';
  }

  async parseBrief(text: string): Promise<ParsedCriteria> {
    const slugs = NICHES.map((n) => `${n.slug} (${n.labelEs})`).join(', ');
    const system =
      'Extraé criterios de campaña de influencer marketing de un brief en español. ' +
      'Respondé SOLO JSON con las claves: niches (array de slugs de esta lista: ' +
      slugs +
      '), country (código ISO-2 del creador, como AR/MX), audienceCountry (código ISO-2 del PÚBLICO objetivo: "audiencia en México" → MX), platform (instagram|tiktok|youtube|twitch|x), ' +
      'followersMin, followersMax (enteros), engagementMin (0-100), contentType (ugc|influencer|both), budget. ' +
      'Omití claves desconocidas. niches debe usar SOLO slugs de la lista.';
    const content = await this.chat(system, text, 300);
    return JSON.parse(content) as ParsedCriteria;
  }

  async rationales(input: RationaleInput): Promise<Record<string, string>> {
    const system =
      'Para cada creador, escribí UNA línea en español (≤140 caracteres) explicando por qué encaja con el brief. ' +
      'Usá SOLO los datos provistos; no inventes métricas. ' +
      'Respondé SOLO JSON: un objeto { "<id>": "<razón>" }.';
    const user = JSON.stringify(input);
    const content = await this.chat(
      system,
      user,
      60 * input.creators.length + 100,
    );
    return JSON.parse(content) as Record<string, string>;
  }
}
