# CreatorLink — Integraciones de métricas verificadas (visión general)

*Fecha: 2026-06-20*

Documentación para la integración **directa** con las APIs oficiales de cada red social,
sin usar agregadores de terceros (Phyllo, Modash, etc.). El objetivo es que un creator se
onboardee, conecte su cuenta vía OAuth y expongamos sus métricas **verificadas**
(followers, engagement, stats de contenido y, donde se pueda, demografía de audiencia).

Documentos por plataforma:
- [Instagram](./instagram.md) — Instagram API with Instagram Login
- [TikTok](./tiktok.md) — Login Kit + Display API
- [YouTube](./youtube.md) — Data API v3 + Analytics API

---

## Modelo común: OAuth con consentimiento del creator

Las tres plataformas siguen el mismo patrón de alto nivel:

1. El creator hace clic en "Conectar Instagram/TikTok/YouTube" en el onboarding.
2. Lo redirigimos al diálogo de autorización OAuth de la plataforma.
3. Vuelve a nuestro `redirect_uri` con un `code`.
4. El backend (NestJS) intercambia el `code` por un **access token** + **refresh token** (server-side, con el `client_secret`).
5. Guardamos los tokens cifrados, llamamos a los endpoints de métricas y persistimos snapshots.
6. Un cron refresca los tokens antes de que expiren.

> **Regla de oro:** todo intercambio/refresh de tokens ocurre en el backend. El `client_secret`
> nunca llega al frontend Next.js.

---

## Qué se puede obtener por plataforma (resumen)

| Dato | Instagram | TikTok | YouTube |
|---|---|---|---|
| Follower / subscriber count | ✅ `followers_count` | ✅ `follower_count` | ✅ `subscriberCount` (redondeado) |
| Stats por post/video (likes, comments, etc.) | ✅ | ✅ | ✅ |
| Reach / impressions / views | ✅ `reach`, `views` | ✅ `view_count` | ✅ `viewCount` |
| Shares | ✅ | ✅ | ⚠️ solo Analytics API |
| Engagement rate | ❌ se calcula | ❌ se calcula | ❌ se calcula |
| Demografía de audiencia (edad/género/país) | ✅ ≥100 followers | ❌ no (commercial) | ✅ vía Analytics API (solo logged-in) |

**Ninguna plataforma devuelve el "engagement rate" como campo** — siempre lo calculamos nosotros
a partir de los stats crudos. Ver la sección de cada doc.

---

## Esfuerzo de aprobación / revisión (lo más importante para el roadmap)

Las tres requieren pasar por una revisión de la plataforma **antes** de poder servir a creators
reales que no sean parte de tu app. Hasta entonces, cada una tiene un modo dev/sandbox que sirve
para construir y testear con cuentas propias.

| Plataforma | Modo dev sin revisión | Requisito para producción | Timeline estimado |
|---|---|---|---|
| Instagram | Development Mode (solo cuentas con rol en la app) | **App Review + Business Verification** de Meta | App Review ~1 semana + Business Verification ~2–4 semanas |
| TikTok | Sandbox (5 sandboxes, 10 cuentas test) | **App Review / audit** (sin SLA oficial) | ~1–3 semanas, iterando rechazos |
| YouTube | Testing mode (100 users, refresh token expira a los **7 días**) | **Brand + Sensitive scope verification** (NO requiere CASA — los scopes de YouTube son "sensitive", no "restricted") | ~2–4 semanas |

> ⚠️ Estos plazos son procesos burocráticos externos. No atar fechas de lanzamiento a ellos.
> Empezar las solicitudes temprano y tener un demo path en sandbox/dev.

---

## Modelo de datos sugerido (Prisma)

El diseño actual ([2026-03-12-creatorlink-design.md](../plans/2026-03-12-creatorlink-design.md))
ya tiene `social_accounts` con `platform`, `handle`, `followers`, `engagement_rate`. Para la
integración directa necesitamos extenderlo con tokens, estado de conexión y snapshots históricos.

```prisma
enum SocialPlatform {
  instagram
  tiktok
  youtube
}

enum ConnectionStatus {
  connected
  needs_reauth   // token expirado/revocado → re-OAuth
  metrics_unavailable // p.ej. cuenta personal IG, o <100 followers
  error
}

model SocialAccount {
  id              String           @id @default(cuid())
  creatorId       String
  creator         CreatorProfile   @relation(fields: [creatorId], references: [id])
  platform        SocialPlatform
  handle          String
  platformUserId  String           // ig user_id / tiktok open_id / youtube channelId
  status          ConnectionStatus @default(connected)

  // OAuth (cifrar a nivel app o columna)
  accessToken      String
  refreshToken     String?
  accessTokenExp   DateTime?
  refreshTokenExp  DateTime?
  scopes           String[]

  // últimos valores (denormalizados para búsqueda rápida)
  followers        Int?
  engagementRate   Float?
  lastSyncedAt     DateTime?

  snapshots        SocialAccountSnapshot[]

  @@unique([platform, platformUserId])
}

// Snapshot periódico para construir tendencias y mostrar engagement estable.
model SocialAccountSnapshot {
  id              String        @id @default(cuid())
  socialAccountId String
  account         SocialAccount @relation(fields: [socialAccountId], references: [id])
  capturedAt      DateTime      @default(now())

  followers       Int?
  following       Int?
  mediaCount      Int?
  totalLikes      Int?         // donde aplique (tiktok likes_count)
  engagementRate  Float?
  // demografía como JSON: { age: {...}, gender: {...}, country: {...} }
  demographics    Json?
  raw             Json?        // payload crudo para auditoría/recálculo
}
```

**Por qué snapshots:** las APIs devuelven valores puntuales (no históricos). Para mostrar
"engagement rate" estable y tendencias de crecimiento, snapshoteamos periódicamente (p.ej. diario)
y promediamos sobre las últimas N publicaciones.

---

## Patrón de tokens (NestJS)

- Guardar `accessToken` + `refreshToken` cifrados, con sus fechas de expiración.
- **Cron de refresh** (`@nestjs/schedule`) que recorre cuentas y refresca tokens próximos a vencer.
  Cada plataforma tiene su cadencia (ver docs). Si el refresh falla → marcar `needs_reauth` y
  notificar al creator para reconectar.
- Manejar **scopes parciales**: el creator puede autorizar un subconjunto. Leer siempre los scopes
  efectivamente concedidos y degradar con gracia.

---

## Recomendación de fasing

1. **Fase 0 (MVP actual):** métricas ingresadas a mano, perfil marcado como "no verificado".
2. **Fase 1 — YouTube:** la integración más simple (Google OAuth bien documentado, sin CASA).
   Buen primer caso para validar el patrón de tokens + snapshots.
3. **Fase 2 — Instagram:** mayor valor para el negocio (es la red dominante de influencers), pero
   App Review + Business Verification es el proceso más lento → empezar la verificación en paralelo
   a la Fase 1.
4. **Fase 3 — TikTok:** completar la cobertura. Asumir desde el diseño que **no hay demografía**
   por la vía comercial.

> Justificación del orden: arrancamos por la integración técnicamente más simple (YouTube) para
> dejar firme el patrón compartido de OAuth/tokens/snapshots, mientras corre en paralelo el trámite
> más lento (Business Verification de Meta). Ajustable según prioridad de negocio.
