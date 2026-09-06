# Auditoría del sitio — Pelis Original

Documento vivo con el inventario de gaps, bugs e incompletitudes.  
Última actualización: 2026-09-06 (CI deploy genera Prisma antes de `build:vercel`; Android TV Compose en git + pairing `/api/tv-auth`).

---

## Resumen ejecutivo

| Área               | Estado        | Notas                                                                                                            |
| ------------------ | ------------- | ---------------------------------------------------------------------------------------------------------------- |
| Catálogo películas | OK            | Filtros, búsqueda, detalle                                                                                       |
| Catálogo series    | Crítico       | Admin `Series` ≠ público `Movie.mediaType`                                                                       |
| Anime catálogo     | OK            | CRUD admin, listado                                                                                              |
| Anime streaming    | En reparación | IDs incorrectos + API Consumet inestable                                                                         |
| TV en vivo         | OK            | IPTV, probe admin                                                                                                |
| Auth               | OK            | Better Auth + Google                                                                                             |
| Suscripción        | OK código     | Checkout → sync/webhook → ACTIVE. Ops en Movies (túnel + .env + Postgres local), no Vercel                       |
| PWA                | Parcial       | Update modal + sin install/descarga in-app; SW precache de uploads sigue siendo ruido                            |
| Android TV         | Parcial       | Fuentes Compose en `apps/android-tv/app/src/` (2026-09-06). Build en máquina con SDK 35.                         |
| Imágenes           | Alto          | Pósters hash faltantes en clone limpio                                                                           |
| CI / calidad       | Parcial       | format+test+build+deploy en GitHub Actions; `deploy` genera Prisma antes de `build:vercel`. Build ignora TS/lint |
| Docs agentes       | OK            | AGENTS.md + docs/APP, ARCHITECTURE, DATA-MODEL, TESTING                                                          |

---

## Crítico

### 1. Streaming anime roto

**Síntoma:** Al seleccionar proveedor no aparecen episodios o el video falla.

**Causas:**

- El frontend envía un slug del título a Consumet en lugar del AniList ID.
- El modelo `Anime` no tenía `anilistId` persistido.
- `api.consumet.org` público suele devolver 500.

**Archivos:** `apps/web/src/app/(protected)/anime/[id]/page.tsx`, `packages/db/src/actions/anime.ts`

**Estado:** En progreso — ver `docs/ANIME-PROVIDERS.md`.

### 2. Series admin vs público desalineadas

**Síntoma:** Series creadas en `/admin/series` no aparecen en `/series` público.

**Causa:** Admin usa tabla `Series`; frontend usa `Movie` con `mediaType: SERIES`. Fallback: cada 3ª película se muestra como serie fake.

**Archivos:** `packages/db/src/queries/movies.ts` (listSeries), `packages/db/src/queries/adminSeries.ts`

**Acción pendiente:** Unificar fuente de verdad (migrar admin → `Movie.mediaType = SERIES`).

### 3. Pósters hash faltantes en entornos nuevos

**Síntoma:** Imágenes rotas en clone limpio.

**Causa:** `apps/web/public/peliculas/peliculas/` está gitignored y vacío; BD apunta a hashes MD5.

**Archivos:** `packages/db/src/lib/resolveMovieImage.ts`, `scripts/audit-images.mjs`

**Acción pendiente:** Copiar assets en deploy o migrar a `/uploads/`.

---

## Alto

### 4. Service Worker precachea uploads efímeros

**Síntoma:** `public/sw.js` cambia en cada build con cientos de `/uploads/*.webp`.

**Archivos:** `apps/web/sw.ts`, `apps/web/public/sw.js`

**Acción:** Excluir `/uploads/` del precache; usar runtime cache con límite.

### 5. `/api/stream/*` sin autenticación

**Síntoma:** URLs de streaming accesibles sin sesión si se conocen.

**Archivos:** `apps/web/src/app/api/stream/`

**Estado:** Corregido 2026-08-29 — denyUnlessStreamAccess (requireActivePlan) en stream peliculas/TV/anime. No quitar.

### 5b. Pago Stripe sin plan activo

**Síntoma:** Checkout OK en Stripe, el usuario no podía ver películas (`requireActivePlan` 403).

**Causas:**

- `/subscribe/success` solo hacía poll de `users.me` y dependía del webhook `checkout.session.completed`.
- `customer.subscription.updated` con `incomplete` (y sus retries) marcaba EXPIRED y pisaba el ACTIVE.
- No se escuchaba `customer.subscription.created` ni `invoice.paid`.

**Estado:** Corregido 2026-09-05 — `stripe.syncCheckoutSession` + alta compartida en `packages/db/src/lib/stripe-subscription.ts`. `incomplete` ya no degrada ACTIVE.

**Dónde corre:** todo es local en **Movies** (`/home/det/Desktop/PELIS/pelis-original`). Prod = `pelis-web.service` en localhost:3000 + cloudflared → https://verpelis.pro. Postgres es local. No diagnosticar como si fuera un deploy Vercel.

**Verificar en Movies** (tras merge a staging/main y restart de `pelis-web`):

1. **Túnel vivo:** `systemctl is-active pelis-web` y cloudflared; `curl -sI https://verpelis.pro/api/stripe/webhook` no debe ser 404 del edge.
2. **Endpoint Stripe:** Dashboard → Developers → Webhooks → URL `https://verpelis.pro/api/stripe/webhook` (mismo modo test/live que las keys). Eventos: `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `customer.subscription.created/updated/deleted`, `invoice.paid`, `invoice.payment_failed`. El `whsec_…` de ese endpoint es el `STRIPE_WEBHOOK_SECRET` del `.env` de Movies.
3. **`.env` local (no leerlo ni commitearlo):** `STRIPE_SECRET_KEY` / publishable del mismo modo; `SITE_URL=https://verpelis.pro` (si queda en localhost, Stripe redirige al browser del usuario y el sync no pega en Movies).
4. **Fila `subscription` en Postgres local:** tras un pago, `userId` del comprador, `status = ACTIVE`, `endDate` futuro, `stripeSubscriptionId` y `planId` no nulos. Sin esa fila, `requireActivePlan` sigue en 403.
5. **Logs:** `journalctl -u pelis-web` alrededor del pago (webhook 200 vs 400 firma / 500 handler). En Stripe Dashboard, deliveries de ese endpoint (no un endpoint viejo de Vercel/CLI).
6. **Fallback success:** `/subscribe/success` llama `POST /api/stripe/fulfill` con `session_id`. No exige cookie (el grupo `(protected)` no es muro de login; la cookie puede no volver por el túnel). Crea la misma fila vía metadata `convexUserId`.
7. **Redirects:** si `SITE_URL` en Movies quedó en localhost, el código usa `BETTER_AUTH_URL` / `NEXT_PUBLIC_SITE_URL` públicos (`https://verpelis.pro`) para success/cancel. Confirmar que Stripe redirige a verpelis.pro, no a localhost del usuario.

### 6. Build ignora errores TypeScript y ESLint

**Archivo:** `apps/web/next.config.mjs` — `ignoreBuildErrors: true`, `ignoreDuringBuilds: true`

**Acción pendiente:** Habilitar checks en CI y corregir errores gradualmente.

---

## Medio

### 7. Anime ausente en bottom tab bar (móvil)

**Archivo:** `apps/web/src/app/(protected)/components/bottom-tab-bar.tsx`

**Estado:** Corregido — anime añadido a navegación móvil.

### 8. Búsqueda global no incluye anime

**Archivo:** `apps/web/src/app/(protected)/components/search-dropdown.tsx`

**Estado:** Corregido — búsqueda incluye anime vía `anime.search`.

### 9. Admin anime `getById` sin `toAnimeShape`

**Archivo:** `packages/db/src/queries/adminAnime.ts`

**Estado:** Corregido — devuelve `_id` y status en minúsculas.

### 10. README y TODO desactualizados

**Archivos:** `README.md`, `TODO.md`

**Estado:** Actualizados — stack Postgres + `@pelis/db`, no Convex.

### 11b. Prompts PWA de instalar app

**Síntoma:** Barras/modales de «instalar app» (`pwa-install-prompt`, `tv-install-bar`, `beforeinstallprompt`) y falta de consentimiento al actualizar el SW.

**Estado:** Corregido 2026-09-05 — se quitaron los CTAs de instalar; `PwaRuntime` silencia el banner nativo y muestra modal Aceptar / Más tarde. En Movies el check usa `/api/app/availability` (disco) + SW waiting; `version.json`/`sw.js` no se cachean. 2026-09-06 — también se quitaron `AppDownloadButtons` de `/profile` y footer. Package TWA alineado a `pro.verpelis.twa` (assetlinks + twa-manifest). Prod ya sirve `/.well-known/assetlinks.json` como JSON sin redirect y Google lista el statement. La barra gris URL + compartir no es un componente: es chrome de Chrome o Custom Tabs. No se oculta con CSS. TWA standalone solo si el APK instalado es `pro.verpelis.twa` firmado con el SHA256 de assetlinks; si el usuario abre una pestaña de Chrome, la barra queda. Runtime = systemd local, no Vercel.

### 11. Admin anime: providers JSON vs streaming

**Síntoma:** Campo `providers` en BD es informativo; no controla reproducción.

**Acción:** Documentado en `docs/ANIME-PROVIDERS.md`. Streaming usa proveedores centralizados en `anime-providers.ts`.

### 11c. Admin create/update sin `movieSchema`

**Síntoma:** `movies.create` / `movies.update` (y `adminSeries.*`) aceptaban cualquier string/number; `movieSchema` de `@pelis/validators` no se usaba.

**Estado:** Corregido 2026-09-05 — `packages/db/src/lib/movie-payload.ts` extiende `movieSchema`. `invoke()` sigue respondiendo 400 `Invalid args for "<name>": …`.

---

## Bajo

| Issue                          | Archivo                                 | Estado                                                                                                |
| ------------------------------ | --------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| not-found.tsx custom           | apps/web/src/app/not-found.tsx          | Corregido                                                                                             |
| CI GitHub Actions              | `.github/workflows/ci.yml`              | format+test+build (gate). `deploy` (post-merge) corre `prisma generate` + `build:vercel` (2026-09-06) |
| Sin monitoreo Sentry activo    | —                                       | Pendiente                                                                                             |
| E2E login/favoritos/historial  | `e2e/account.e2e.ts`, `e2e/auth.e2e.ts` | Corregido 2026-09-05                                                                                  |
| E2E roto (referencia Convex)   | `e2e/email-verification.e2e.ts`         | Pendiente                                                                                             |
| Loading/error ad-hoc           | páginas de catálogo y cuenta            | Corregido 2026-09-05 — `ErrorState` + `useQueryResult`                                                |
| next/image remotes incompletos | `apps/web/next.config.mjs`              | Corregido 2026-09-05                                                                                  |
| Sin favoritos/historial anime  | schema                                  | Pendiente                                                                                             |
| Sin SEO `generateMetadata`     | páginas detalle                         | Pendiente                                                                                             |

---

## Matriz de features

| Feature                   | Estado                                                                                     |
| ------------------------- | ------------------------------------------------------------------------------------------ |
| Home + carruseles         | Completo                                                                                   |
| Catálogo películas        | Completo                                                                                   |
| Catálogo series           | Roto/desalineado                                                                           |
| Detalle película + player | Completo                                                                                   |
| Detalle serie             | Parcial (sin episodios)                                                                    |
| Anime catálogo            | Completo                                                                                   |
| Anime reproducción        | En reparación                                                                              |
| TV en vivo                | Completo                                                                                   |
| Favoritos / Historial     | Completo (solo películas)                                                                  |
| Perfil                    | Completo                                                                                   |
| Auth                      | Completo                                                                                   |
| Stripe suscripción        | Completo (código; keys/webhook ops)                                                        |
| Admin CRUD                | Completo                                                                                   |
| PWA                       | Parcial                                                                                    |
| Tests E2E                 | Parcial (login/favoritos/historial en account.e2e.ts; email-verification sigue era Convex) |
| Android TV nativo         | Parcial (fuentes en git; pairing/QR; build Gradle en Movies/SDK)                           |

---

## Dependencias externas

| Servicio                | Uso                   | Riesgo                                                                                            |
| ----------------------- | --------------------- | ------------------------------------------------------------------------------------------------- |
| Consumet API            | Episodios/video anime | Alta — auto-hospedar                                                                              |
| AniList GraphQL         | Metadata anime        | Baja — gratis                                                                                     |
| TMDB                    | Enrichment posters    | Media — requiere API key                                                                          |
| Stripe                  | Pagos                 | Media — keys + webhook al túnel de Movies (`verpelis.pro/api/stripe/webhook`). No Vercel. Ver §5b |
| Paths locales streaming | Películas             | Alta — específico del servidor                                                                    |

---

## Cómo mantener este documento

1. Al cerrar un issue, mover de "Pendiente" a "Corregido" con fecha.
2. Nuevos bugs: añadir fila con severidad y archivos clave.
3. Revisar mensualmente items "En progreso".
