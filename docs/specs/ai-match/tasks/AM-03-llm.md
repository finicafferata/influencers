# AM-03 — LLM interface + NestJS service + context DI

*Backend · Depends on: none · The riskiest wiring (Step-4)*

## Objective
A provider-agnostic LLM interface in the context, implemented server-side with the cheapest model, degrading gracefully when no key is set.

## Decisions
- **Cheapest small model**, server-side only; env-configured; **2 calls max per run**.
- `trpc` package holds the **interface only**; the SDK lives in `apps/api`.

## Requirements
1. **Interface** (`packages/trpc/src/llm.ts`):
   ```ts
   interface ParsedCriteria { niches: string[]; country?: string; platform?: string;
     followersMin?: number; followersMax?: number; engagementMin?: number;
     contentType?: 'ugc'|'influencer'|'both'; budget?: number }
   interface RationaleInput { brief: string; creators: { id: string; facts: string }[] }
   interface LlmClient {
     readonly enabled: boolean;
     parseBrief(text: string): Promise<ParsedCriteria>;
     rationales(input: RationaleInput): Promise<Record<string,string>>; // id -> ≤140 chars (es)
   }
   ```
2. **Context** (`trpc.ts`): add `llm?: LlmClient`. Procedures null-check (`ctx.llm?.enabled`).
3. **NestJS** (`apps/api/src/llm/`): `LlmService implements LlmClient` (mirror `EmailService`): read `LLM_PROVIDER`/`LLM_MODEL`/`LLM_API_KEY` in `onModuleInit`; `enabled=false` + client null when no key. `LlmModule` exports it.
4. **DI wiring (critical):** inject `LlmService` into `TrpcRouter` constructor; **import `LlmModule` into `TrpcModule`** (not just app.module); set `llm: this.llm` in `createContext`.
5. **Prompts:** parse → strict JSON (Zod-validated, niches ⊆ constant, numbers clamped); rationales → one batched call, low `max_tokens`, grounded ("use only provided facts"), Spanish, ≤140 chars each.
6. **Cost guardrails:** ≤2 calls/run; optional in-memory parse cache by `hash(text)`.

## Acceptance
- With a key: `parseBrief` returns validated criteria; `rationales` returns one line per id.
- With no key: `enabled=false`; procedures skip LLM (heuristic parse, no rationales); no crash; **key never in the web bundle**.
- DI resolves (`LlmModule` imported into `TrpcModule`); `LlmService` structurally satisfies `LlmClient`.

## Test plan
- Unit: parse JSON validation/clamping; enabled=false path.
- Integration (mock client): assert ≤2 calls per run.

## Human review
- [ ] Approve model/provider + per-brief token/budget ceiling.
- [ ] Confirm DI wiring into TrpcModule (the silent-failure trap).
