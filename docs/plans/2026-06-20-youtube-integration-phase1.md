# Fase 1 — Integración YouTube (métricas verificadas)

*Fecha: 2026-06-20 · Referencia técnica: [docs/integrations/youtube.md](../integrations/youtube.md)*

Plan de implementación concreto para que un creator conecte su canal de YouTube vía OAuth y
expongamos sus métricas **verificadas** (subscribers, views, engagement, demografía). Es la primera
integración directa; deja firme el patrón compartido de OAuth/tokens/snapshots que reutilizarán
Instagram y TikTok.

> **Por qué YouTube primero:** ya existe Google OAuth en el repo
> ([auth/google.strategy.ts](../../apps/api/src/auth/google.strategy.ts)), `youtube` ya es una
> plataforma válida ([constants.ts](../../packages/trpc/src/constants.ts)), y los scopes de YouTube
> son "sensitive" (no requieren auditoría CASA). Es el camino de menor fricción técnica.

---

## 0. Estado actual del repo (lo que ya existe)

- **Auth:** Google OAuth de **login** (passport `google` strategy, scopes `email`/`profile`) +
  magic link. El callback entrega un JWT al web que setea la cookie httpOnly first-party.
- **`SocialAccount`** ([schema.prisma](../../packages/db/prisma/schema.prisma)) ya tiene
  `verified`, `verificationSource`, `verifiedAt`, `engagementRate`, y campos de audiencia
  (`audienceTopCountry`, `audienceCountries`, `audienceAges`, `audienceGender`, `audienceVerified`,
  `audienceSource`, `audienceVerifiedAt`). Único por `[creatorId, platform]`. **No tiene tokens OAuth.**
- **tRPC:** `creatorProcedure` adjunta `creatorId`; `creator` router ya tiene
  `addSocialAccount`/`updateSocialAccount` (self-reported). Routers se registran en
  [root.ts](../../packages/trpc/src/root.ts).
- **Sin** `@nestjs/schedule` instalado todavía (lo necesitamos para el cron de refresh).

---

## 1. Decisiones de arquitectura

1. **Flujo de conexión separado del login.** El login Google es identidad. La conexión de YouTube es
   una autorización aparte con scopes distintos + `access_type=offline` (para obtener refresh token).
   **No** tocamos la `GoogleStrategy` de login. Nuevo controller dedicado.

2. **Reusar el mismo OAuth client de Google** (`GOOGLE_CLIENT_ID`/`SECRET`) — solo hay que habilitar
   las APIs de YouTube en el mismo proyecto GCP y agregar los scopes al consent screen + verificación.
   Callback URL distinta (`/social/youtube/callback`).

3. **El callback NO tiene la cookie de sesión.** La cookie es first-party del origen web, no del API.
   Por eso identificamos al creator con un **`state` firmado** (JWT corto con `creatorId`), generado al
   pedir la URL de conexión. Mismo razonamiento que el proxy del login Google ya documentado en el repo.

4. **Tokens en un modelo nuevo `SocialConnection`, separado de `SocialAccount`.** Razones:
   - `SocialAccount.followers` es `Int` **no-nullable** → no podemos crear el registro público antes de
     tener datos. La conexión existe desde el callback; el `SocialAccount` se crea/actualiza recién en
     el primer sync.
   - Tokens son sensibles → fuera del `include` público que sirve el search.

5. **Tokens cifrados en reposo** (AES-256-GCM, clave de env `SOCIAL_TOKEN_ENC_KEY`). Nunca en texto plano.

6. **Snapshots históricos** (`SocialAccountSnapshot`) porque la API solo da valores puntuales; el
   engagement rate y las tendencias se construyen promediando/comparando snapshots.

---

## 2. Cambios de schema (Prisma)

`packages/db/prisma/schema.prisma`. Agregar dos modelos y relaciones; `SocialAccount` queda casi igual
(sumamos el back-relation a snapshots y un link opcional a la conexión).

```prisma
model SocialConnection {
  id             String    @id @default(cuid())
  creatorId      String
  platform       String                       // 'youtube' | 'instagram' | 'tiktok'
  platformUserId String                       // channelId de YouTube
  handle         String?                      // @canal, para mostrar

  // OAuth — TODOS los tokens cifrados a nivel app (AES-256-GCM)
  accessToken     String   @db.Text
  refreshToken    String?  @db.Text
  accessTokenExp  DateTime?
  scopes          String[]

  status         String    @default("connected") // connected | needs_reauth | error
  lastError      String?
  lastSyncedAt   DateTime?
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt

  creator CreatorProfile @relation(fields: [creatorId], references: [id], onDelete: Cascade)

  @@unique([creatorId, platform])
  @@index([creatorId])
  @@index([status])
  @@index([accessTokenExp])              // para el cron de refresh
}

model SocialAccountSnapshot {
  id              String   @id @default(cuid())
  socialAccountId String
  capturedAt      DateTime @default(now())

  followers       Int?
  totalViews      BigInt?
  videoCount      Int?
  engagementRate  Float?
  demographics    Json?     // { ages: {...}, gender: {...}, countries: [{code,pct}] }
  raw             Json?     // payload crudo, para auditoría/recálculo

  account SocialAccount @relation(fields: [socialAccountId], references: [id], onDelete: Cascade)

  @@index([socialAccountId, capturedAt])
}
```

Relaciones a sumar:
- En `CreatorProfile`: `socialConnections SocialConnection[]`
- En `SocialAccount`: `snapshots SocialAccountSnapshot[]`

**Convención de `verificationSource`:** hoy se usa `self_reported` (métricas) y `self_declared`
(audiencia). Sumamos el valor **`youtube_api`** para métricas/audiencia verificadas por esta integración.

Migración:
```bash
pnpm --filter @repo/db exec prisma migrate dev --name social_connections_and_snapshots
```

> `BigInt` para `totalViews`: los view counts de canales grandes superan `Int`. Ojo con la
> serialización JSON de BigInt en tRPC (ver §6, gotchas).

---

## 3. Backend — módulo NestJS `social/`

Estructura nueva en `apps/api/src/social/`:

```
social/
  social.module.ts
  social.controller.ts          # GET /social/youtube/connect | callback
  crypto.service.ts             # encrypt/decrypt AES-256-GCM
  social-connection.service.ts  # CRUD de SocialConnection + manejo de tokens
  youtube/
    youtube-oauth.service.ts    # build consent URL, code→tokens, refresh
    youtube-api.service.ts      # llamadas Data API v3 + Analytics API
    youtube-sync.service.ts     # orquesta fetch → computa ER → upsert SocialAccount + snapshot
  social-refresh.cron.ts        # @nestjs/schedule, refresca tokens por vencer
```

### 3.1 Dependencias

```bash
pnpm --filter @repo/api add @nestjs/schedule googleapis
```
- `googleapis` (cliente oficial de Google) maneja el OAuth2 client, refresh automático y las
  llamadas a Data/Analytics API con tipos. Alternativa: `fetch` crudo si querés menos peso.

### 3.2 `crypto.service.ts`

AES-256-GCM con `SOCIAL_TOKEN_ENC_KEY` (32 bytes base64). Formato almacenado: `iv:authTag:ciphertext`
(base64). Métodos `encrypt(plain): string` / `decrypt(stored): string`. Falla ruidoso si falta la key.

### 3.3 `youtube-oauth.service.ts`

- **`buildConsentUrl(state: string): string`** → `accounts.google.com/o/oauth2/v2/auth` con:
  `client_id`, `redirect_uri=${API_URL}/social/youtube/callback`, `response_type=code`,
  `scope='https://www.googleapis.com/auth/youtube.readonly https://www.googleapis.com/auth/yt-analytics.readonly'`,
  `access_type=offline`, `prompt=consent`, `state`, `include_granted_scopes=true`.
- **`exchangeCode(code): { accessToken, refreshToken, expiry, scopes }`** → POST `oauth2.googleapis.com/token`.
- **`refresh(refreshToken): { accessToken, expiry }`** → `grant_type=refresh_token`.

### 3.4 `youtube-api.service.ts`

Recibe un `accessToken` y devuelve datos normalizados. Endpoints (ver
[youtube.md §5](../integrations/youtube.md)):
- `channels.list?part=statistics,contentDetails&mine=true` → `subscriberCount`, `viewCount`,
  `videoCount`, `hiddenSubscriberCount`, `uploads` playlistId.
- `playlistItems.list?playlistId={uploads}&maxResults=20` → últimos videoIds.
- `videos.list?part=statistics&id={...}` (batch ≤50) → `viewCount`, `likeCount`, `commentCount` por video.
- `youtubeanalytics.googleapis.com/v2/reports?ids=channel==MINE&dimensions=ageGroup,gender&metrics=viewerPercentage`
  + `dimensions=country&metrics=views` → demografía (con `endDate` ≈ hoy-3 por el lag).

**Costo de cuota:** ~3 unidades por sync (channels + playlistItems + videos). Holgado.

### 3.5 `youtube-sync.service.ts`

`syncConnection(connectionId)`:
1. Cargar conexión, descifrar accessToken (refrescar si vencido vía `social-connection.service`).
2. Traer stats de canal + últimos N videos + demografía.
3. **Calcular engagement rate:** `avg_N( (likeCount + commentCount) / viewCount ) * 100` sobre los
   videos con `viewCount > 0`.
4. **Upsert `SocialAccount`** por `[creatorId, 'youtube']`:
   - `followers = subscriberCount`, `engagementRate`, `handle`,
   - `verified = true`, `verificationSource = 'youtube_api'`, `verifiedAt = now()`,
   - demografía → `audience*` + `audienceVerified = true`, `audienceSource = 'youtube_api'`.
   - Disparar la extension que mantiene `maxFollowers`/`maxEngagement` (igual que `addSocialAccount`).
5. **Crear `SocialAccountSnapshot`** con followers/views/videoCount/ER/demographics/raw.
6. Actualizar `SocialConnection.lastSyncedAt`, `status='connected'`, limpiar `lastError`.
7. En error → `status='error'` (o `needs_reauth` si el refresh falló) + `lastError`, y log.

### 3.6 `social.controller.ts`

```ts
@Controller('social')
export class SocialController {
  // El web NO entra acá directo (no tiene forma de firmar el state); ver tRPC §4.
  // Pero exponemos el callback de Google:
  @Get('youtube/callback')
  async youtubeCallback(@Query('code') code, @Query('state') state, @Res() res) {
    const { creatorId } = verifySignedState(state); // JWT corto; 400 si inválido/expirado
    const tokens = await this.oauth.exchangeCode(code);
    const conn = await this.connections.upsertYoutube(creatorId, tokens); // cifra y guarda
    await this.sync.syncConnection(conn.id);                              // primer sync inmediato
    const web = process.env.WEB_URL ?? 'http://localhost:3000';
    res.redirect(`${web}/onboarding/social?connected=youtube`);
  }
}
```
Manejo de errores del callback (`?error=access_denied`, code faltante) → redirect a
`/onboarding/social?error=youtube`.

### 3.7 `social-refresh.cron.ts`

`@Cron` diario: buscar conexiones con `accessTokenExp < now + 1d` y `refreshToken` presente, refrescar,
re-cifrar y guardar. Si el refresh falla → `status='needs_reauth'` y crear `Notification` para el creator.
Registrar `ScheduleModule.forRoot()` en `app.module.ts`.

> ⚠️ **Recordatorio de [youtube.md §7](../integrations/youtube.md):** en *Testing mode* de Google los
> refresh tokens expiran a los **7 días**. Hay que publicar el OAuth a producción antes de onboardear
> creators reales, o toda conexión se rompe en silencio.

---

## 4. tRPC — router `social`

Nuevo `packages/trpc/src/routers/social.ts`, registrado en
[root.ts](../../packages/trpc/src/root.ts) como `social`. Todas las procedures bajo `creatorProcedure`.

| Procedure | Tipo | Qué hace |
|---|---|---|
| `getConnectUrl({ platform })` | mutation | Firma un `state` JWT con `creatorId` (exp 10 min) y devuelve la consent URL de `youtube-oauth.service`. El web hace `window.location = url`. |
| `getConnections()` | query | Lista `SocialConnection` del creator (status, handle, lastSyncedAt) **sin tokens**. Para pintar la UI. |
| `resync({ platform })` | mutation | Dispara `syncConnection` on-demand. `rateLimit` (p.ej. 5/hora) para no abusar cuota. |
| `disconnect({ platform })` | mutation | Revoca el token en Google, borra la `SocialConnection`, y marca el `SocialAccount` `verified=false`, `verificationSource='self_reported'`. |

> **Nota de wiring:** la lógica vive en los services de NestJS, pero tRPC corre dentro del API
> (ver [trpc.module.ts](../../apps/api/src/trpc/trpc.module.ts)). Inyectar los services al `Context`
> de tRPC (como ya se hace con `db` y `llm`), o exponer un endpoint REST fino y que el router lo llame.
> Recomendado: sumar `socialOAuth`/`socialSync` al `Context` para mantener el patrón existente.

`getConnectUrl` y `getConnections` requieren extender el `Context` de
[trpc.ts](../../packages/trpc/src/trpc.ts) con los services. Definir los inputs con zod usando
`PLATFORM_SET` (por ahora solo `youtube` aceptado; rechazar el resto con `BAD_REQUEST` "próximamente").

---

## 5. Frontend — onboarding (Next.js)

Paso 2 del onboarding ("social accounts + metrics"). Hoy es carga manual; sumamos la opción verificada.

1. **Botón "Conectar YouTube (verificado)"** junto a la carga manual:
   ```tsx
   const connect = trpc.social.getConnectUrl.useMutation();
   <Button onClick={async () => {
     const { url } = await connect.mutateAsync({ platform: 'youtube' });
     window.location.href = url;
   }}>Conectar YouTube</Button>
   ```
2. **Página de retorno** `/onboarding/social` lee `?connected=youtube` (toast de éxito) o `?error=youtube`.
3. **Estado conectado:** `trpc.social.getConnections.useQuery()` → mostrar handle, badge "Verificado",
   métricas sincronizadas (subs/ER), `lastSyncedAt`, y botones "Re-sincronizar" / "Desconectar".
4. **Diferenciar visualmente** cuentas `verified` (badge + fuente "YouTube") de las `self_reported`.
5. Manejar el caso `status='needs_reauth'` → CTA "Reconectar".

El perfil público ([creator getByUsername](../../packages/trpc/src/routers/creator.ts)) ya expone
`verified` en el `include`; el badge en el perfil sale gratis una vez que el sync setea `verified=true`.

---

## 6. Variables de entorno + gotchas

Agregar a `.env.example`:
```bash
# Clave para cifrar tokens OAuth de redes (32 bytes): openssl rand -base64 32
SOCIAL_TOKEN_ENC_KEY=
# (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET ya existen — reusar el mismo OAuth client)
```

**Gotchas a respetar (de [youtube.md](../integrations/youtube.md)):**
- `subscriberCount` viene **redondeado a 3 cifras** (>1.000 subs). Mostrarlo como aproximado.
- `viewerPercentage` (demografía) es solo de viewers **logueados** → etiquetar "muestra de audiencia".
- Analytics tiene **lag de 48–72h** → consultar con `endDate ≈ hoy-3`.
- **BigInt en tRPC:** `viewCount` puede exceder `Int`. O usás superjson en el transformer de tRPC, o
  serializás `totalViews` a string en el límite. Decidir y aplicar consistente.
- `chequear `hiddenSubscriberCount`` antes de mostrar subs.

---

## 7. Setup de Google Cloud (checklist, una vez)

1. En el proyecto GCP existente: **habilitar YouTube Data API v3 + YouTube Analytics API**.
2. OAuth consent screen → agregar scopes `youtube.readonly` y `yt-analytics.readonly` (sensitive).
3. Agregar `${API_URL}/social/youtube/callback` a las redirect URIs del OAuth client.
4. **Para dev:** agregar tu cuenta como test user (refresh token dura 7 días en testing).
5. **Para prod:** enviar a verificación (brand + sensitive scope, ~2–4 semanas, sin CASA). Empezar temprano.

---

## 8. Secuencia de tareas (PRs sugeridos)

1. **Schema:** `SocialConnection` + `SocialAccountSnapshot` + migración. (+ `verificationSource='youtube_api'`).
2. **Infra cripto + tokens:** `crypto.service`, `social-connection.service`, env var, tests de round-trip.
3. **OAuth flow:** `youtube-oauth.service` + `social.controller` (connect URL via tRPC, callback). Probar
   end-to-end con tu canal en testing mode.
4. **Sync:** `youtube-api.service` + `youtube-sync.service` (stats + ER). Snapshot + upsert SocialAccount.
5. **Demografía:** Analytics API en el sync.
6. **Cron de refresh** + `ScheduleModule` + notificación `needs_reauth`.
7. **tRPC `social` router** completo (`getConnections`, `resync`, `disconnect`).
8. **Frontend onboarding:** botón conectar, estado, badges, reconectar.
9. **Hardening:** rate limits, manejo de scopes parciales, errores de callback, BigInt serialization.

---

## 9. Testing

- **Unit:** `crypto.service` (encrypt→decrypt), cálculo de ER (videos con 0 views excluidos), parsing de
  respuestas de la API (fixtures).
- **Integration:** callback con `state` inválido/expirado → 400; sync idempotente (re-sync no duplica
  SocialAccount, sí agrega snapshot).
- **Manual E2E:** conectar canal real en testing mode → ver métricas verificadas en el perfil.
- Seguir el patrón de specs existente (`*.spec.ts` junto al archivo, ver auth).

---

## 10. Fuera de alcance (Fase 1)

- Instagram y TikTok (Fases 2 y 3 — mismo patrón, ver sus docs).
- Sync programado recurrente de métricas (más allá del refresh de tokens). Por ahora: sync en el
  connect + `resync` manual. Un cron de re-sync diario de métricas es candidato a fase siguiente.
- Discovery de canales no autorizados.
- Verificación de producción de Google (es trámite, no código — arrancar en paralelo).
```
