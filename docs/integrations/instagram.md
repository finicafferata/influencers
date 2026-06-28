# CreatorLink — Integración directa con Instagram (2026)

*Fecha: 2026-06-20 · Vía: "Instagram API with Instagram Login"*

> Toda afirmación relevante está citada a docs oficiales de Meta (developers.facebook.com).
> Versión de Graph API en docs al momento: `v25.0` — fijar versión en las URLs y seguir el
> [changelog](https://developers.facebook.com/docs/instagram-platform/changelog/).

---

## TL;DR

- Usar **"Instagram API with Instagram Login"** (parte de la moderna **Instagram Platform**).
  Es el único camino donde el creator se onboardea solo con sus credenciales de Instagram
  (**sin Facebook Page vinculada**) y aun así exponemos insights de media, de cuenta y demografía.
- La vieja **Instagram Basic Display API murió (4 dic 2024)** y nunca devolvió métricas profesionales.
- El creator debe tener cuenta **profesional (Business o Creator)**.
- Para leer métricas de creators que no son roles de tu app necesitás **Advanced Access**, que exige
  **App Review + Business Verification**.

---

## 1. Qué API usar

| | Instagram API with Instagram Login ✅ | Instagram API with Facebook Login |
|---|---|---|
| Login | OAuth 2.0 directo vía Instagram | OAuth vía Facebook |
| ¿Requiere Facebook Page? | **No** | **Sí** (IG ligada a una FB Page) |
| Tipo de cuenta | Profesional (Business/Creator) | Profesional (Business/Creator) |
| Token | IG User token (1h → 60 días) | FB User / Page tokens |
| Host | `graph.instagram.com` | `graph.facebook.com` |
| ¿Insights + demografía? | **Sí** | Sí |
| Exclusivo | — | Business Discovery de otras cuentas, hashtag search, `story_insights` |

**Por qué Instagram Login:** pedir que el creator tenga/vincule una Facebook Page es una fuente
enorme de abandono en el onboarding. Instagram Login lo elimina.
([overview](https://developers.facebook.com/docs/instagram-platform/overview/),
[IG-Login docs](https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/))

Solo cambiar a "Facebook Login" si más adelante necesitamos **Business Discovery** (métricas
públicas de cuentas que NO autorizaron) o hashtag search.

---

## 2. Requisitos de cuenta

- Cuenta **profesional**: Business o Creator. No funciona con cuentas personales.
  ([FB-Login docs](https://developers.facebook.com/docs/instagram-platform/instagram-api-with-facebook-login/))
- Con Instagram Login **no** hace falta Facebook Page.
- **Insights/demografía requieren ≥100 followers.** Por debajo, devuelve dataset vacío
  (¡vacío, no 0!). ([insights](https://developers.facebook.com/docs/instagram-platform/insights/))
- **No hay insights para media publicada antes** de que la cuenta fuera profesional.

**Implicación de onboarding:** tras el OAuth, leer `account_type`. Si es personal → pedir que
cambie a profesional y re-autorice. Si tiene <100 followers → marcar "demografía no disponible".

---

## 3. Flujo OAuth

### Setup de la app (Meta App Dashboard)
1. Crear app tipo **Business**.
2. Agregar producto **Instagram** → "API setup with Instagram business login".
3. Configurar **OAuth redirect URIs** (allowlist) y anotar **Instagram App ID** / **App Secret**.
4. Todas las llamadas van a `graph.instagram.com` (ej. `https://graph.instagram.com/v25.0/me`).

([get-started](https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/get-started))

### Flujo (authorization code grant)

| Paso | Método + URL | Params clave |
|---|---|---|
| 1. Autorizar | `GET https://www.instagram.com/oauth/authorize` (host canónico documentado: `api.instagram.com`) | `client_id`, `redirect_uri`, `response_type=code`, `scope` (separado por coma), `state` (CSRF) |
| 2. Code → token corto | `POST https://api.instagram.com/oauth/access_token` | `client_id`, `client_secret`, `grant_type=authorization_code`, `redirect_uri`, `code` |
| 3. Corto → largo (60 días) | `GET https://graph.instagram.com/access_token` | `grant_type=ig_exchange_token`, `client_secret`, `access_token` |
| 4. Refresh del largo | `GET https://graph.instagram.com/refresh_access_token` | `grant_type=ig_refresh_token`, `access_token` |

Refs: [oauth-authorize](https://developers.facebook.com/docs/instagram-platform/reference/oauth-authorize/) ·
[business-login](https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/business-login/) ·
[access_token](https://developers.facebook.com/docs/instagram-platform/reference/access_token/) ·
[refresh_access_token](https://developers.facebook.com/docs/instagram-platform/reference/refresh_access_token/)

### Ciclo de vida del token
- Token corto: **válido 1 hora**.
- Token largo: **válido 60 días**.
- Refresh: el token debe tener **≥24h de antigüedad y no estar expirado**; refrescar extiende
  **otros 60 días**.
- ⚠️ Un token largo sin refrescar por 60 días **expira permanentemente** → el creator debe re-autorizar.
- ⚠️ Pasos 3 y 4 usan el **App Secret** → **solo server-side** (NestJS, nunca el cliente Next.js).

**Implementación (NestJS):** guardar token largo + `expires_at` por creator; cron diario que
refresca tokens con >~50 días. Si el refresh falla → `needs_reauth` y notificar.

---

## 4. Scopes (permisos)

| Scope | Habilita |
|---|---|
| `instagram_business_basic` | Metadata básica de perfil; base de la que dependen los demás. |
| **`instagram_business_manage_insights`** | **Insights de media, de cuenta y demografía de audiencia.** Este es el scope clave para métricas. |
| `instagram_business_content_publish` | Publicar posts (no lo necesitamos). |
| `instagram_business_manage_comments` | Gestionar comentarios (no lo necesitamos). |
| `instagram_business_manage_messages` | Gestionar DMs (no lo necesitamos). |

**Para CreatorLink pedir:** `instagram_business_basic` + `instagram_business_manage_insights`.
Omitir el resto simplifica el App Review.

> ⚠️ Los strings de scope cambiaron (~27 ene 2025): los viejos `business_basic` están deprecados,
> ahora prefijo `instagram_business_*`.
> ([permissions](https://developers.facebook.com/docs/permissions/),
> [Meta blog 2025-03-24](https://developers.facebook.com/blog/post/2025/03/24/user-and-media-insights-on-instagram-api-with-instagram-login/))

---

## 5. App Review + Business Verification

- **Standard Access (default):** funciona solo para usuarios con un **rol** en tu app (Admin,
  Developer, Tester). Sirve para dev/testing con cuentas propias — **sin revisión**.
- **Advanced Access (necesario para creators reales):** requerido para servir cuentas profesionales
  que no son tuyas. Exige **App Review + Business Verification**. `instagram_business_manage_insights`
  requiere Advanced Access.

([overview](https://developers.facebook.com/docs/instagram-platform/overview/),
[app-roles](https://developers.facebook.com/docs/development/build-and-test/app-roles/),
[Meta blog](https://developers.facebook.com/blog/post/2025/03/24/user-and-media-insights-on-instagram-api-with-instagram-login/))

### Qué pide el App Review
([submission guide](https://developers.facebook.com/docs/resp-plat-initiatives/individual-processes/app-review/submission-guide))
- **Screencast** mostrando cada permiso en uso (lo que no se muestra, no se aprueba). ≥1080p, UI en inglés.
- **Descripción de uso única por permiso** (no copy-paste): para qué, por qué, cómo se usa el dato.
- **Instrucciones de testing** paso a paso (nunca incluir tus credenciales personales de Meta).
- **Privacy Policy URL**.

### Timeline
- App Review: Meta apunta a **~1 semana**.
- Business Verification: proceso aparte, **~2–4 semanas** (estimaciones de guías 2026).
- Planear en semanas, no días.

### Dev sin revisión
En Development Mode la app tiene todos los permisos pero solo accede a datos de usuarios con rol.
Se puede construir y testear insights/demografía contra tu propia cuenta profesional con rol asignado
antes de enviar a revisión.
([app-modes](https://developers.facebook.com/docs/development/build-and-test/app-modes/))

---

## 6. Endpoints, campos y métricas

Host `graph.instagram.com`, autenticado con el token del creator.

### Perfil / cuenta
```
GET /me?fields=user_id,username,name,biography,followers_count,follows_count,media_count,profile_picture_url,account_type
```
⚠️ El campo es **`followers_count`** (con "s"), no `follower_count`.
([ig-user](https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-user/))

### Lista de media
```
GET /{ig-user-id}/media?fields=id,caption,media_type,media_url,permalink,timestamp,like_count,comments_count
```
⚠️ `like_count` (sin "s") pero `comments_count` (con "s").

### Insights por media
```
GET /{ig-media-id}/insights?metric=likes,comments,reach,saved,shares,total_interactions,views
```
- Métricas vigentes: `likes`, `comments`, `reach`, **`saved`**, `shares`, `total_interactions`,
  `views`, + reels (`ig_reels_avg_watch_time`, etc.) y stories (`navigation`, `profile_visits`, `follows`).
- ⚠️ **`impressions` está deprecado → usar `views`** (forzado tras 21 abr 2025 para media creada
  después del 2 jul 2024). También retirados: `plays`, `video_views`, `clips_replays_count` → `views`.
- ✅ `reach` **no** está deprecado.

([ig-media insights](https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-media/insights),
[v22.0 changelog](https://developers.facebook.com/docs/graph-api/changelog/version22.0/))

### Insights de cuenta
```
GET /{ig-user-id}/insights?metric=reach,accounts_engaged,total_interactions,follows_and_unfollows&period=day&metric_type=total_value
```
- Métricas: `reach`, `accounts_engaged`, `total_interactions`, `follows_and_unfollows`,
  `profile_views`, `likes`, `comments`, `saves`, `shares`, `views`, `online_followers`.
- ⚠️ A nivel cuenta es **`saves`** (plural); a nivel media es **`saved`** (pasado).
- `accounts_engaged`, `total_interactions`, `follows_and_unfollows` requieren `metric_type=total_value`.
- ⚠️ El cambio neto de followers viene de **`follows_and_unfollows`** (con `period=day` +
  `metric_type=total_value`, ≥100 followers). El total de followers es el *campo* `followers_count`
  del objeto user.

([ig-user insights](https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-user/insights/))

### Demografía de audiencia
```
GET /{ig-user-id}/insights?metric=follower_demographics&period=lifetime&metric_type=total_value&breakdown=age
```
- Métricas: `follower_demographics`, `engaged_audience_demographics`, `reached_audience_demographics`.
- Requieren `metric_type=total_value` + `period=lifetime`; `breakdown` ∈ {`age`, `gender`, `city`, `country`}.
- ⚠️ **No se devuelve si <100 followers.** Solo ~45 segmentos top; puede tener lag de ~48h.
- ⚠️ Se eliminaron los timeframes `last_14_days`/`last_30_days`/etc. — solo `lifetime` funciona ahora.

([insights](https://developers.facebook.com/docs/instagram-platform/insights/),
[changelog](https://developers.facebook.com/docs/instagram-platform/changelog/))

### Calcular engagement rate (no es un campo)
- **Por post, basado en reach:** `total_interactions / reach`
  (o `(likes + comments + saved + shares) / reach`).
- **Por post, basado en followers:** `(like_count + comments_count) / followers_count`.
- **A nivel cuenta:** `accounts_engaged / reach`.
- Para el "engagement rate" del perfil en el marketplace: promediar el rate por post (basado en
  followers) sobre los últimos N posts (convención de industria, no un campo de Meta).

---

## 7. Rate limits

**Business Use Case (BUC)** — por app + app-user, ventana móvil 24h:
- `Calls / 24h = 4800 × Impressions` (impressions = veces que el contenido apareció en pantalla en 24h).
- Piso: impressions mínimo 10 → al menos ~48.000 llamadas/24h incluso para cuentas chicas.

**Platform / app-level** — ventana móvil 1h: `Calls / hour = 200 × usuarios`.

**Leer en runtime, no hardcodear:** monitorear headers `X-Business-Use-Case-Usage`
(`call_count`, `total_cputime`, `total_time` como %, + `estimated_time_to_regain_access`) y
`X-App-Usage`. Al 100% estás throttleado. Errores: 4, 17, 32, 613, HTTP 429.

([rate-limiting](https://developers.facebook.com/docs/graph-api/overview/rate-limiting/))

---

## 8. Gotchas (2026)

1. **`impressions` murió → `views`.** `views` es más inclusivo (cuenta cada imagen del carrusel,
   incluye replays); no es equivalente 1:1 a impressions histórico.
2. **`saved` (media) vs `saves` (cuenta)** y **`followers_count` vs `follower_count`** — los bugs
   de nombre más fáciles de cometer.
3. **<100 followers ⇒ sin demografía** y varias métricas de cuenta vacías. La API devuelve vacío,
   **no 0**.
4. **El token expira en silencio y de forma permanente** si no se refresca dentro de los 60 días
   (y no se puede refrescar en las primeras 24h). Construir el cron de refresh desde el día uno.
5. **No hay métricas de media pre-profesional**; insights de stories solo viven 24h.
6. **Demografía:** solo `lifetime`, ~45 segmentos top, lag hasta 48h.
7. **Advanced Access gate:** nada funciona para creators externos reales hasta aprobar
   App Review + Business Verification. Mientras tanto, dev con cuentas con rol.
8. **App Secret solo server-side** para token exchange/refresh.
9. **La versión de Graph API sube ~trimestral.** Fijar versión y seguir el changelog.

---

### Fuentes
[Instagram Platform overview](https://developers.facebook.com/docs/instagram-platform/overview/) ·
[IG API with Instagram Login](https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/) ·
[get-started](https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/get-started) ·
[ig-user reference](https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-user/) ·
[ig-media insights](https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-media/insights) ·
[ig-user insights](https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-user/insights/) ·
[insights](https://developers.facebook.com/docs/instagram-platform/insights/) ·
[permissions](https://developers.facebook.com/docs/permissions/) ·
[rate-limiting](https://developers.facebook.com/docs/graph-api/overview/rate-limiting/) ·
[changelog](https://developers.facebook.com/docs/instagram-platform/changelog/)
