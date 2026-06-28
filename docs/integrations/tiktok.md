# CreatorLink — Integración directa con TikTok (2026)

*Fecha: 2026-06-20 · Vía: Login Kit + Display API*

> Endpoints v2 en `open.tiktokapis.com`. Toda afirmación clave citada a docs oficiales
> (developers.tiktok.com), salvo donde se marca confianza baja.

---

## TL;DR

- Para creators auto-onboardeados usar **Login Kit + Display API**.
- Con los scopes `user.info.stats` y `video.list` obtenemos **follower/following/likes/video count
  verificados** + stats por video (views, likes, comments, shares).
- ❌ **No** hay demografía de audiencia ni engagement rate precalculado por esta vía. El engagement
  rate lo calculamos nosotros.
- La **Research API está prohibida para entidades comerciales** (solo académico/non-profit).
- "Creator Search Insights API" (discovery con demografía) aparece solo en fuentes de terceros →
  **no diseñar nada alrededor de eso** hasta verificarlo en el portal oficial.

---

## 1. Qué productos aplican

| Producto | Uso | Auth | ¿Usar? |
|---|---|---|---|
| **Login Kit** | El creator autoriza tu app vía OAuth 2.0 | OAuth por usuario | **Sí — primario** |
| **Display API** | Leer perfil, stats y lista de videos del creator autorizado | User access token | **Sí — primario** |
| **Research API** | Datos públicos masivos (cualquier user), followers/following, comentarios | Credenciales de research | **No — comerciales inelegibles** |
| **Creator Search Insights API** | Discovery sin auth del creator | App access token (según terceros) | **No por ahora — sin confirmar oficialmente** |

Display API se compone de 3 endpoints: `/v2/user/info/`, `/v2/video/list/`, `/v2/video/query/`.
([Display API Overview](https://developers.tiktok.com/doc/display-api-overview))

Para discovery de creators que **no** autorizaron, no hay producto oficial comercial que devuelva
sus stats. La Research API lo cubriría pero es non-commercial.

---

## 2. Registro de la app

1. **Crear developer account + app** en developers.tiktok.com (email business).
   ([Create an App](https://developers.tiktok.com/doc/getting-started-create-an-app))
2. **Sandbox primero.** No requiere app review. Hasta **5 sandboxes por app** y **10 cuentas TikTok
   target** para testear. ([Introducing Sandbox](https://developers.tiktok.com/blog/introducing-sandbox))
3. **Agregar productos + scopes:** Login Kit, y Display API con `user.info.profile`,
   `user.info.stats`, `video.list`.
4. **Enviar a Production / App Review** para salir a público. Revisión **manual, sin SLA**.
   Estado: Draft → In review → Live. Apps nuevas pasan por **audit** con justificación + mockups de UX.
   ([App Review FAQ](https://developers.tiktok.com/doc/getting-started-faq),
   [App Review Guidelines](https://developers.tiktok.com/doc/app-review-guidelines/),
   [Developer Guidelines](https://developers.tiktok.com/doc/our-guidelines-developer-guidelines))
5. **Aumento de cap de usuarios activos:** se pide por Support una vez en producción; no garantizado.

**Timeline realista:** sandbox en horas. Producción típicamente días-a-semanas (sin SLA oficial).
Presupuestar 1–3 semanas e iterar sobre rechazos.

---

## 3. Flujo OAuth (Login Kit) — Web

**Paso A — Autorización** (redirigir el browser del creator):
```
GET https://www.tiktok.com/v2/auth/authorize/
  ?client_key=YOUR_CLIENT_KEY
  &response_type=code
  &scope=user.info.profile,user.info.stats,video.list   # separado por comas
  &redirect_uri=https://app.creatorlink.com/oauth/tiktok/callback
  &state=CSRF_RANDOM
```
El callback vuelve con `code`, `scopes` (lo que el user realmente concedió — puede ser un subconjunto),
`state`, y en error `error`/`error_description`.
([Login Kit for Web](https://developers.tiktok.com/doc/login-kit-web/))

**Paso B — Intercambio de token:**
```
POST https://open.tiktokapis.com/v2/oauth/token/
Content-Type: application/x-www-form-urlencoded

client_key=...&client_secret=...&code=<url-decoded>&grant_type=authorization_code
&redirect_uri=<igual que paso A>
```
Respuesta:
- `access_token`, `expires_in = 86400` (**24h**)
- `refresh_token`, `refresh_expires_in = 31536000` (**365 días**)
- `scope` (concedidos), `open_id`, `token_type = Bearer`

**Paso C — Refresh** (sin interacción; refrescar proactivamente, p.ej. diario antes de las 24h):
```
POST https://open.tiktokapis.com/v2/oauth/token/
client_key=...&client_secret=...&grant_type=refresh_token&refresh_token=...
```

([OAuth Token Management](https://developers.tiktok.com/doc/oauth-user-access-token-management))

> ⚠️ **Rotación del refresh token:** el `refresh_token` devuelto puede ser distinto al enviado.
> **Hay que persistir y usar el nuevo** cuando cambia, o se pierde el acceso a las 24h.
> Revocar vía `POST https://open.tiktokapis.com/v2/oauth/revoke/`.

> **PKCE:** requerido para mobile/desktop. El flujo **Web server-side (NestJS) NO requiere PKCE** —
> usa authorization-code estándar con `client_secret`.

---

## 4. Scopes

| Scope | Devuelve |
|---|---|
| `user.info.basic` | `open_id`, `union_id`, `avatar_url`, `display_name` |
| `user.info.profile` | `bio_description`, `profile_deep_link`, `is_verified`, `username` |
| `user.info.stats` | **`follower_count`, `following_count`, `likes_count`, `video_count`** |
| `video.list` | Leer los videos públicos del user (metadata + stats por video) |

> ⚠️ **Migración (29/02/2024):** `user.info.basic` ya **no** devuelve follower/likes/video counts ni
> bio/verificación — se separaron en `user.info.profile` y `user.info.stats`. Pedir campos de stats
> sin `user.info.stats` da HTTP 401 `scope_not_authorized`. **Pedir los tres scopes.**

([Scopes Reference](https://developers.tiktok.com/doc/tiktok-api-scopes),
[User Info Scope Migration](https://developers.tiktok.com/bulletin/user-info-scope-migration))

---

## 5. Endpoints, campos, engagement rate, demografía

### Perfil + stats
```
GET https://open.tiktokapis.com/v2/user/info/?fields=open_id,union_id,avatar_url,display_name,bio_description,profile_deep_link,is_verified,username,follower_count,following_count,likes_count,video_count
Authorization: Bearer <access_token>
```
Campos verificados a nivel cuenta: **`follower_count`, `following_count`, `likes_count`,
`video_count`** (requieren `user.info.stats`).
([User Info v2](https://developers.tiktok.com/doc/tiktok-api-v2-get-user-info))

### Lista de videos (stats por video)
```
POST https://open.tiktokapis.com/v2/video/list/?fields=id,create_time,cover_image_url,share_url,video_description,duration,title,like_count,comment_count,share_count,view_count
Authorization: Bearer <access_token>
Body: { "max_count": 20, "cursor": <unix_ms> }   # max_count máx 20; default 10
```
- Paginación: si `has_more` es true, pasar el `cursor` devuelto (orden `create_time` desc).
- Campos del Video Object: `id`, `create_time`, `cover_image_url` (TTL 6h), `share_url`,
  `video_description`, `duration`, `title`, `embed_html`, `embed_link`,
  **`like_count`, `comment_count`, `share_count`, `view_count`**.

([Video List v2](https://developers.tiktok.com/doc/tiktok-api-v2-video-list),
[Video Object](https://developers.tiktok.com/doc/tiktok-api-v2-video-object))

### Calcular engagement rate (hay que derivarlo)
No existe campo de engagement rate. Derivaciones estándar:
- **Por video (por views):** `(like_count + comment_count + share_count) / view_count`
- **A nivel cuenta (por followers)** — común en marketplaces: promedio sobre los últimos N videos:
  `avg_N( (like_count + comment_count + share_count) / follower_count )`

`follower_count` viene de `/v2/user/info/` y los counts por video de `/v2/video/list/`.
Snapshotear periódicamente para tendencias (la API solo da valores puntuales).

### Demografía de audiencia
**No disponible** vía Login Kit + Display API. Solo existe en la Research API (non-commercial) y en
la supuesta Creator Search Insights (sin confirmar). **Para un marketplace comercial: tratar la
demografía como no obtenible** por la vía oficial de auto-onboarding hoy.

---

## 6. Research API — elegibilidad

- ❌ **Entidades comerciales NO elegibles.** Hay que ser "independiente de intereses comerciales" y
  hacer research "non-profit / non-commercial".
- ✅ Elegibles: instituciones académicas en US/EEA/UK/Suiza; non-profits de research en EU; etc.
- Conclusión: **CreatorLink, como marketplace comercial, no puede usarla.**

([Research API product](https://developers.tiktok.com/products/research-api/),
[Research API FAQ](https://developers.tiktok.com/doc/research-api-faq))

---

## 7. Rate limits

**Display API:** **600 requests/minuto por endpoint** (`/v2/user/info/`, `/v2/video/list/`,
`/v2/video/query/`), ventana móvil de 1 minuto. Exceso → HTTP `429` `rate_limit_exceeded`.
Sin cap diario declarado; aumentos vía Support.
([Rate Limits](https://developers.tiktok.com/doc/tiktok-api-v2-rate-limit/))

---

## 8. Gotchas (2026)

- **Scopes parciales:** el user puede conceder un subconjunto. Leer siempre `scope`/`scopes`
  devuelto y degradar con gracia si falta `user.info.stats` o `video.list`.
- **Rotación de refresh token:** persistir el nuevo `refresh_token` cuando cambia, o se pierde el
  acceso a las 24h. Cron diario de refresh.
- **Techo de 365 días del refresh token:** si el creator no reconecta en un año, debe re-autorizar.
  Notificar antes de la expiración.
- **Sin engagement rate ni demografía** por la vía de auto-onboarding — calcular ER nosotros y
  snapshotear para tendencias.
- **`cover_image_url` tiene TTL de 6h** — cachear los bytes de la imagen, no guardar la URL a largo plazo.
- **Apps sin audit muy restringidas:** contenido posteado por clientes sin audit se fuerza a privado;
  acceso efectivamente limitado a usuarios sandbox/test hasta pasar review.
- **Branding:** seguir App Review Guidelines y reglas de branding (botón "Continue with TikTok"
  aprobado, logos correctos, justificación de scopes, mockups de UX en el audit).
- **Sin SLA de review:** no atar fechas de lanzamiento; tener demo path en sandbox.
- **Usar endpoints v2** (`open.tiktokapis.com/v2/...`); v1 user-info está deprecado.

> **Confianza baja — Creator Search Insights API:** las únicas fuentes que la describen como API de
> discovery 2026 con demografía son de terceros (Phyllo/blotato). No se confirmó endpoint, scope ni
> elegibilidad oficial. No arquitecturar discovery alrededor de esto sin verificarlo.

---

### Fuentes
[Display API Overview](https://developers.tiktok.com/doc/display-api-overview) ·
[User Info v2](https://developers.tiktok.com/doc/tiktok-api-v2-get-user-info) ·
[Video List v2](https://developers.tiktok.com/doc/tiktok-api-v2-video-list) ·
[Video Object](https://developers.tiktok.com/doc/tiktok-api-v2-video-object) ·
[Scopes Reference](https://developers.tiktok.com/doc/tiktok-api-scopes) ·
[User Info Scope Migration](https://developers.tiktok.com/bulletin/user-info-scope-migration) ·
[Login Kit for Web](https://developers.tiktok.com/doc/login-kit-web/) ·
[OAuth Token Management](https://developers.tiktok.com/doc/oauth-user-access-token-management) ·
[Rate Limits](https://developers.tiktok.com/doc/tiktok-api-v2-rate-limit/) ·
[Research API](https://developers.tiktok.com/products/research-api/) ·
[Create an App](https://developers.tiktok.com/doc/getting-started-create-an-app) ·
[App Review FAQ](https://developers.tiktok.com/doc/getting-started-faq) ·
[Introducing Sandbox](https://developers.tiktok.com/blog/introducing-sandbox)
