# CreatorLink — Integración directa con YouTube (2026)

*Fecha: 2026-06-20 · Vía: YouTube Data API v3 + YouTube Analytics API*

> Toda afirmación clave citada a docs oficiales de Google (developers.google.com/youtube).
> El sistema de cuota cambió en **junio 2026** — ver §6 (las guías 2023–2024 están desactualizadas).

---

## TL;DR

- Se usan **dos APIs** con dos modelos de auth:
  - **Data API v3** → stats públicos (subscriberCount, viewCount, likeCount). API key o OAuth.
  - **Analytics API** → demografía, watch time, shares. **OAuth obligatorio** (`channel==MINE`).
- Recomendación: como el creator conecta su **propio** canal y queremos datos **verificados**,
  correr **todo por OAuth** (incluso las llamadas Data API). Una API key queda como fallback para
  previsualizar canales públicos antes de que el creator autorice.
- **Ventaja clave de costo/tiempo:** los scopes de YouTube son **"sensitive", NO "restricted"** →
  **no hay auditoría CASA** ni fee de assessor. Verificación ~2–4 semanas.

---

## 1. Qué APIs y cuándo OAuth vs API key

| Necesidad | API | Auth | Por qué |
|---|---|---|---|
| subscriberCount, viewCount, videoCount; likeCount/commentCount por video; metadata | **YouTube Data API v3** | API key (u OAuth) | Datos públicos legibles con key |
| Demografía (edad/género/geo), watch time, shares, engagement real | **YouTube Analytics API** | **OAuth 2.0 obligatorio** (`ids=channel==MINE`) | Datos privados del dueño; no hay vía API-key |

- Data API: channel statistics legibles con API key.
  ([channels.list](https://developers.google.com/youtube/v3/docs/channels/list))
- Analytics API: "todas las requests deben estar autorizadas" por el dueño vía OAuth.
  ([channel_reports](https://developers.google.com/youtube/analytics/channel_reports))
- **Reporting API** (una tercera API) es para descargas batch diarias programadas, no on-demand.
  Para el flujo "conectá y mostrame mis métricas ahora" usar **Analytics API** (`reports.query`),
  no Reporting. ([reporting](https://developers.google.com/youtube/reporting))

---

## 2. Setup Google Cloud, consent screen, verificación, timeline

### Setup
1. Crear proyecto en Google Cloud.
2. APIs & Services → Library → habilitar **YouTube Data API v3** y **YouTube Analytics API**.
   ([getting-started](https://developers.google.com/youtube/v3/getting-started))
3. Configurar **OAuth consent screen** (ahora bajo "Google Auth Platform" en la consola, UI 2025–2026).
   ([configure-oauth-consent](https://developers.google.com/workspace/guides/configure-oauth-consent))
4. Credentials → OAuth client ID (Web application), setear redirect URIs.
   ([server-side-web-apps](https://developers.google.com/youtube/v3/guides/auth/server-side-web-apps))

### Clasificación de scopes (define el costo de verificación)
**Todos los scopes de YouTube son "sensitive", NO "restricted".** Los restricted (tipo
Gmail/Drive/Fitness/Photos) disparan un assessment de seguridad CASA pago. **YouTube no.** Este es
el dato de costo/tiempo más importante del doc.
([sensitive-scope-verification](https://developers.google.com/identity/protocols/oauth2/production-readiness/sensitive-scope-verification),
[restricted-scope-verification](https://developers.google.com/identity/protocols/oauth2/production-readiness/restricted-scope-verification))

### Camino de verificación y timeline
- **Testing mode** (sin verificación): hasta **100 test users**, y los **refresh tokens expiran a los
  7 días**. Solo para desarrollo.
  ([policies](https://developers.google.com/identity/protocols/oauth2/policies))
- **Production (verificado):** obligatorio porque usamos scopes sensitive en público. Dos pasos:
  - **Brand verification** (dominio, nombre de app, privacy policy + homepage): ~2–3 días hábiles.
  - **Sensitive scope verification** (justificación por scope + video demo del flujo OAuth):
    **~10 días** según Google; en la práctica puede estirarse a semanas con idas y vueltas.
- **Sin CASA, sin recertificación anual, sin fee de $500–$4.500** — eso es solo para restricted.
  ([security-assessment](https://support.google.com/cloud/answer/13465431))
- **Si no verificás:** los users ven el warning "Google hasn't verified this app" y quedás capado a
  100 users. ([warning-screen](https://support.google.com/cloud/answer/7454865))

**Estimación:** ~2–4 semanas wall-clock a verificación completa, con privacy policy limpia, dominio
verificado y video demo claro.

---

## 3. Flujo OAuth 2.0 (web server / authorization code)

- **Authorization endpoint:** `https://accounts.google.com/o/oauth2/v2/auth`
- **Token endpoint:** `https://oauth2.googleapis.com/token`
- ([web-server](https://developers.google.com/identity/protocols/oauth2/web-server))

**Params de auth:** `client_id`, `redirect_uri`, `response_type=code`, `scope`, `state`,
**`access_type=offline`** (devuelve refresh token en el primer exchange),
**`prompt=consent`** (fuerza el consent para reemitir refresh token de forma confiable).

**Code → token:** POST al token endpoint con `client_id`, `client_secret`, `code`,
`grant_type=authorization_code`, `redirect_uri`.

**Lifetimes y refresh:**
- Access token: corto (`expires_in` ~3600s).
- Refresh: POST `grant_type=refresh_token`.
- ⚠️ El **refresh token muere si:** el user revoca; **6 meses sin uso**; **app en Testing mode →
  expira a los 7 días**; se superan **100 refresh tokens por client ID** (el más viejo se invalida
  en silencio). ([oauth2](https://developers.google.com/identity/protocols/oauth2))

**Implementación (NestJS):** guardar refresh token cifrado
(`SocialAccount { refreshToken, accessToken, accessTokenExp, scopes, platformUserId=channelId }`).
Refresh lazy cuando `accessTokenExp` esté cerca. **Publicar a producción antes de onboardear
creators reales** o cada conexión se rompe en silencio a los 7 días.

---

## 4. Scopes

Pedir el mínimo:

| Scope | Habilita | Clase |
|---|---|---|
| `https://www.googleapis.com/auth/yt-analytics.readonly` | Reports no monetarios: views, watch time, **demografía (edad/género/geo)**, subscribers, shares | Sensitive |
| `https://www.googleapis.com/auth/youtube.readonly` | Leer recursos del Data API: channels, videos, playlists, metadata | Sensitive |
| `https://www.googleapis.com/auth/yt-analytics-monetary.readonly` | Agrega métricas de revenue — **solo si necesitás ingresos** | Sensitive |

> La Analytics API **no** requiere `youtube.readonly` (autoriza con `yt-analytics.readonly`).
> Sumamos `youtube.readonly` aparte para el Data API. Son dos autorizaciones independientes
> pedidas juntas.
> ([scopes](https://developers.google.com/identity/protocols/oauth2/scopes),
> [channel_reports](https://developers.google.com/youtube/analytics/channel_reports))

Evitar (write/overkill): `youtube` (manage), `youtube.force-ssl`, `youtube.upload`, `youtubepartner`.

---

## 5. Endpoints, campos y engagement rate

### Stats de canal — `channels.list` (1 unidad)
```
GET https://www.googleapis.com/youtube/v3/channels?part=statistics,contentDetails&id={channelId}
```
- `statistics.subscriberCount`, `statistics.viewCount`, `statistics.videoCount`,
  `statistics.hiddenSubscriberCount`
- `contentDetails.relatedPlaylists.uploads` → playlist de uploads (para traer videos recientes barato)
- Hasta 50 IDs por llamada. ([channels.list](https://developers.google.com/youtube/v3/docs/channels/list))

### Videos recientes — usar `playlistItems.list`, NO `search.list`
```
GET .../youtube/v3/playlistItems?part=snippet,contentDetails&playlistId={uploadsId}&maxResults=50
```
→ **1 unidad**, da `contentDetails.videoId`. Luego batchear IDs en `videos.list`.
([playlistItems.list](https://developers.google.com/youtube/v3/docs/playlistItems/list))

### Stats por video — `videos.list` (1 unidad)
```
GET .../youtube/v3/videos?part=statistics,snippet&id={id1,id2,...}   # ≤50 IDs
```
- `statistics.viewCount`, `statistics.likeCount`, `statistics.commentCount`
- `snippet.title`, `snippet.publishedAt`
- ⚠️ **No usar:** `dislikeCount` (privado desde 2021-12-13), `favoriteCount` (deprecado 2015, siempre 0).
- **Nuevo (3 jun 2026):** `videos.batchGetStats` trae stats de varios videos en una llamada — evaluar.
  ([videos](https://developers.google.com/youtube/v3/docs/videos),
  [revision_history](https://developers.google.com/youtube/v3/revision_history))

### Demografía y geografía — Analytics API `reports.query`
```
GET https://youtubeanalytics.googleapis.com/v2/reports
  ?ids=channel==MINE&startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&metrics=viewerPercentage&dimensions=ageGroup,gender
```
- `ageGroup`: `age13-17`, `age18-24`, `age25-34`, `age35-44`, `age45-54`, `age55-64`, `age65-`
- `gender`: `female`, `male`, `user_specified`
- `viewerPercentage` = % de viewers **logueados** por bucket (solo audiencia logueada).
- **Geografía:** `dimensions=country&metrics=views,estimatedMinutesWatched` (ISO-3166-1 alpha-2).

([reports.query](https://developers.google.com/youtube/analytics/reference/reports/query),
[channel_reports](https://developers.google.com/youtube/analytics/channel_reports),
[dimensions](https://developers.google.com/youtube/analytics/dimensions))

### Calcular engagement rate (ninguna API lo devuelve)
- **Solo Data API (default):** `(likeCount + commentCount) / viewCount × 100`
- **Con shares** (solo Analytics API): `(likes + comments + shares) / views × 100`
- **Por subscriber:** `(likeCount + commentCount) / subscriberCount × 100` (aproximado por el redondeo)
- **A nivel canal:** promediar el engagement por video sobre las últimas N subidas.
- `shares` está **solo** en la Analytics API, nunca en el Data API.
  ([metrics](https://developers.google.com/youtube/analytics/metrics))

---

## 6. Sistema de cuota — ACTUALIZADO junio 2026

> Las guías 2023–2024 están desactualizadas. Verificado contra docs vivos.

A partir del **1 jun 2026**, YouTube pasó a un **sistema de cuota granular**:
([determine_quota_cost](https://developers.google.com/youtube/v3/determine_quota_cost),
[revision_history](https://developers.google.com/youtube/v3/revision_history))

- **Asignación default:** "100 llamadas a `search.list`, 100 a `videos.insert`, y **10.000
  unidades/día combinadas para todos los demás endpoints**".
- `search.list` ahora cuesta **1 unidad en su propio bucket** (cap 100/día) — **NO 100 unidades**
  como dicen las guías viejas.
- `videos.insert` ahora **1 unidad en su propio bucket** (cap 100/día).
- Lecturas list = **1 unidad** cada una del pool compartido de 10.000: `channels.list`,
  `videos.list`, `playlistItems.list`, etc.
- Cada request, incluso inválida, cuesta ≥1 unidad. Cada página de paginación cuesta de nuevo.
- Reset a medianoche **Pacific Time**, por proyecto de Google Cloud.

**Analytics API:** cuota separada — "cada request cuenta como una unidad". ~10.000 queries/día
comúnmente citado (confianza media).
([data_model](https://developers.google.com/youtube/analytics/data_model))

**Aumento de cuota:** vía "YouTube API Services – Audit and Quota Extension Form", requiere audit de
compliance. Semanas a meses, frecuentemente denegado. Lanzar dentro de 10k primero.
([quota_and_compliance_audits](https://developers.google.com/youtube/v3/guides/quota_and_compliance_audits))

**Cálculo para CreatorLink:** por refresh de creator ≈ 3 unidades (channels.list + playlistItems.list
+ videos.list). 10.000 unidades ≈ **~3.000 refreshes de creator/día** con la cuota default — cómodo
al principio.

---

## 7. Gotchas (2026)

1. **subscriberCount redondeado a 3 cifras significativas** sobre 1.000 subs (123.456 → 123.000),
   desde 2019-09-10 — incluso en request autorizado del dueño. Para el número exacto haría falta
   YouTube Studio (no expuesto por API). Setear expectativas del creator.
2. **hiddenSubscriberCount:** algunos canales ocultan el conteo; chequear el booleano antes de mostrar.
3. **Lag de Analytics:** no finalizado por ~48–72h. Usar `endDate` ≈ 3 días atrás para números estables.
4. **`viewerPercentage` es solo viewers logueados** — demografía es muestra, no audiencia total.
   Etiquetar como "muestra de audiencia" en la UI.
5. **Muerte silenciosa del refresh token:** la expiración a 7 días en Testing mode es el bug #1 de
   onboarding → **publicar a producción antes** de conectar creators reales. Manejar también la
   revocación por 6 meses de inactividad y el cap de 100 tokens/client.
6. **Cifras de cuota viejas en todos lados:** ignorar "search.list = 100 unidades / upload = 1600";
   el sistema granular de junio 2026 las reemplaza.
7. **dislikeCount/favoriteCount son campos muertos** — no depender de ellos.

---

### Fuentes
Data API: [channels.list](https://developers.google.com/youtube/v3/docs/channels/list) ·
[videos](https://developers.google.com/youtube/v3/docs/videos) ·
[playlistItems.list](https://developers.google.com/youtube/v3/docs/playlistItems/list) ·
[quota cost](https://developers.google.com/youtube/v3/determine_quota_cost) ·
[revision history](https://developers.google.com/youtube/v3/revision_history) ·
[quota/compliance audits](https://developers.google.com/youtube/v3/guides/quota_and_compliance_audits)
Analytics API: [channel_reports](https://developers.google.com/youtube/analytics/channel_reports) ·
[reports.query](https://developers.google.com/youtube/analytics/reference/reports/query) ·
[dimensions](https://developers.google.com/youtube/analytics/dimensions) ·
[metrics](https://developers.google.com/youtube/analytics/metrics) ·
[data_model](https://developers.google.com/youtube/analytics/data_model)
OAuth/verificación: [web-server](https://developers.google.com/identity/protocols/oauth2/web-server) ·
[oauth2 policies](https://developers.google.com/identity/protocols/oauth2) ·
[scopes](https://developers.google.com/identity/protocols/oauth2/scopes) ·
[sensitive-scope-verification](https://developers.google.com/identity/protocols/oauth2/production-readiness/sensitive-scope-verification) ·
[unverified-app warning](https://support.google.com/cloud/answer/7454865)
