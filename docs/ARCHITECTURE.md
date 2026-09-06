# ARCHITECTURE.md

Stack actual: Next.js 14 + Postgres/Prisma (@pelis/db) + Better Auth. NUNCA Convex.

## Paquetes

- apps/web (@pelis/web): Next.js 14 App Router, Tailwind cinema-*, Serwist PWA.
- packages/db (@pelis/db): Prisma, registry query/mutation/action, Better Auth server, Stripe, Consumet/AniList.
- packages/ui (@pelis/ui): primitivos shared/ui + features (MovieCard, EmptyState, etc.).
- packages/auth (@pelis/auth): useUser, store, session-sync. No es el servidor de auth.
- packages/validators (@pelis/validators): Zod login/register/movieSchema. Admin `movies.create`/`movies.update` y `adminSeries.create`/`adminSeries.update` validan con `movieSchema` (extendido en `packages/db/src/lib/movie-payload.ts`). Invoke responde 400 `Invalid args for "<name>": campo: mensaje`.
- packages/email (@pelis/email): templates Resend.

## Flujo de datos

Cliente (RSC preloadQuery o hooks useQuery/useMutation/useAction)
-> POST /api/function/<name> (getRequestCtx lee cookie Better Auth)
-> invoke() + registry (packages/db/src/registry.ts)
-> handler en queries/ mutations/ actions/
-> Prisma -> Postgres
-> toMovieShape/toAnimeShape (_id, enums minúsculas, enrichMovieImage)
Mutations llaman notifyChange; el cliente SSE /api/subscriptions/stream invalida queries.

## Auth

Better Auth en packages/db/src/auth.ts (prismaAdapter). Handler HTTP: /api/auth/[...path].
requireUser / requireAdmin / requireActivePlan / hasActivePlan: packages/db/src/lib/requireAdmin.ts.
Admin UI: (admin)/layout.tsx comprueba user.role === admin (minúscula en cliente; BD es ADMIN).
No hay middleware.ts de Next.

## Stripe / plan activo

Checkout crea session con `metadata.convexUserId` + `planId` (y `client_reference_id`).
Alta de `Subscription` ACTIVE: webhook (`checkout.session.completed` / `async_payment_succeeded`, `customer.subscription.created/updated`, `invoice.paid`) **o** `POST /api/stripe/fulfill` (success page; no exige cookie).
`incomplete` no degrada un ACTIVE (retry de webhook). Stream: `denyUnlessStreamAccess` → `requireActivePlan` (ACTIVE + endDate futuro, o ADMIN).

Runtime: **Movies local**. `pelis-web` en localhost:3000, Postgres local, `verpelis.pro` = Cloudflare Tunnel. El webhook de Stripe no va a Vercel: apunta a `https://verpelis.pro/api/stripe/webhook`. Redirects de Checkout usan `resolveStripeRedirectUrl` (si `SITE_URL` es localhost, gana `BETTER_AUTH_URL` público). Diagnóstico: docs/AUDIT.md §5b.

## Imagenes

packages/db/src/lib/resolveMovieImage.ts:

- hash MD5 32 hex -> /peliculas/peliculas/{hash}.webp
- slug -> /peliculas/{slug}.webp
- imageId / backdropImageId -> /uploads/{id}.webp
- URL *.convex.cloud/api/storage -> placeholder /peliculas/placeholder.webp
  Carpetas gitignored. /uploads se sirve por route handler para no reiniciar pelis-web.

## Anime

Catalogo: tabla anime + AniList. Episodios: ani.zip (anizip-client). Play: anime-providers.ts (embed iframe o hls Consumet).
Consumet: docker-compose.yml redis + consumet :3001 (CONSUMET_API_URL). Campo providers JSON es informativo, no controla play.
Detalle: docs/ANIME-PROVIDERS.md.

## TV IPTV

TVChannel + TVPlaylist. Import M3U (filtra no-español). Probe streamStatus ONLINE/OFFLINE. Proxy /api/tv/stream reescribe manifiestos.
Admin: probe, cleanupNonWorking, seedPopular, playlists.

## PWA

Serwist: apps/web/sw.ts -> public/sw.js. Desactivado en development. exclude /uploads/, version.json y assetlinks.json. Manifest `display: standalone`. Sin CTAs de instalar (se silencia `beforeinstallprompt`). Sin `AppDownloadButtons` en perfil/footer. Runtime = Movies (`pelis-web.service` + tunnel), no Vercel. Nueva versión (`/api/app/availability` lee `public/version.json` del disco, o SW en waiting) → modal Aceptar / Más tarde. `version.json` y `sw.js` van con Cache-Control no-store. TWA Bubblewrap: `apps/android` package `pro.verpelis.twa`, host `verpelis.pro`, `fallbackType: customtabs`. DAL: `public/.well-known/assetlinks.json` (package + SHA256). Si Chrome abre el sitio en pestaña/Custom Tabs, la barra de URL no se puede ocultar. Parcial.

## Trampas

(a) Admin tabla Series vs publico Movie.mediaType=SERIES. /admin/series no llena /series. listSeries fallback cada 3ª película.
(b) Restos Convex: CONVEX.md, DEPLOY.md, e2e/email-verification.e2e.ts, shapes _id, URLs convex.cloud.
(c) apps/web/next.config.mjs: typescript.ignoreBuildErrors y eslint.ignoreDuringBuilds.
(d) /api/stream históricamente sin auth. Hoy denyUnlessStreamAccess en stream de películas/TV/anime. No quitar.
(e) Posters gitignored (public/peliculas y public/uploads).
