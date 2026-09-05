# APP.md — Mapa de rutas

Rutas de apps/web/src/app. Grupo (protected) = header/footer, NO exige login. Grupo (admin) si exige role admin en cliente. Grupo (auth) = login/register/verify-email.

## Publicas (catálogo + auth pages)

### `/`

- Hace: home, carruseles featured/trending/peliculas/series.
- Archivos: apps/web/src/app/(protected)/page.tsx, components/home-page-client.tsx
- Auth: ninguna (catálogo publico).
- Datos: movies.getFeatured, movies.getTrending, movies.listSeries, movies.list (mediaType movie), movies.getGenres via preloadQuery.

### `/movies`

- Hace: catálogo de películas con filtros (search/genre/year).
- Archivos: (protected)/movies/page.tsx, movies-page-client.tsx
- Auth: ninguna. Datos: movies.list (movie), movies.getGenres, movies.getYears.

### `/movies/[id]`

- Hace: detalle + player de película o serie (mediaType). Relacionados por genero.
- Archivos: (protected)/movies/[id]/page.tsx, movie-detail-client.tsx
- Auth: ninguna. Datos: movies.getById, movies.getByGenre. Favoritos/historial si hay sesión. Player usa /api/stream/resolve?token= (plan activo).

### `/series`

- Hace: catálogo de series publicas (Movie.mediaType SERIES; fallback fake si vacío)
- Archivos: (protected)/series/page.tsx, series-page-client.tsx
- Auth: ninguna. Datos: movies.listSeries.

### `/anime`

- Hace: catálogo anime agrupado por seriesKey
- Archivos: (protected)/anime/page.tsx
- Auth: ninguna. Datos: anime.listSeries, anime.getGenres, anime.search.

### `/anime/[id]`

- Hace: detalle franchise: temporadas, episodios ani.zip
- Archivos: (protected)/anime/[id]/page.tsx
- Auth: ninguna para ver; reproducir pide plan. Datos: anime.getSeries, anime.getSeasonEpisodes, anime.getProviders.

### `/anime/watch/[animeId]/[episodeNumber]`

- Hace: reproductor episodio (embed iframe o HLS via /api/anime/stream)
- Archivos: (protected)/anime/watch/[animeId]/[episodeNumber]/page.tsx
- Auth: hasActivePlan en cliente para play. Datos: anime.getEpisodeStream, anime.getProviders.

### `/tv`

- Hace: grilla IPTV por categoria, populares, busqueda
- Archivos: (protected)/tv/page.tsx
- Auth: ninguna para listar; stream pide plan. Datos: tv.list, tv.getCategories.

### `/tv/[id]`

- Hace: player HLS del canal (proxy /api/tv/stream/[channelId])
- Archivos: (protected)/tv/[id]/page.tsx, tv-player.tsx, tv-shell.tsx
- Auth: denyUnlessStreamAccess en API. Datos: tv.getById, tv.list.

### `/login`

- Hace: email/password + Google OAuth
- Archivos: (auth)/login/page.tsx, (auth)/layout.tsx
- Auth: publico. Datos: Better Auth /api/auth.

### `/register`

- Hace: alta de cuenta, exige verificar email
- Archivos: (auth)/register/page.tsx
- Auth: publico. Datos: Better Auth sign-up + OTP.

### `/verify-email`

- Hace: OTP 6 digitos (Resend). Query ?email=
- Archivos: (auth)/verify-email/page.tsx
- Auth: publico. Datos: /api/auth/email-otp/* y users.verifyOtp.

## Protegidas (cuenta — gate en cliente via useUser, no layout)

### `/profile`

- Hace: perfil, plan, logout, acceso admin si role admin
- Archivos: (protected)/profile/page.tsx
- Auth: useUser; si no hay user, CTA login. Datos: users.me, subscriptions.list.

### `/favorites`

- Hace: favoritos Movie (no anime). Tabs movie/series
- Archivos: (protected)/favorites/page.tsx
- Auth: useUser. Datos: favorites.listByUser, favorites.remove.

### `/history`

- Hace: continuar viendo + completadas. Solo Movie
- Archivos: (protected)/history/page.tsx
- Auth: useUser. Datos: history.listByUser, history.remove, history.clearAll.

### `/subscribe`

- Hace: planes Stripe checkout/portal
- Archivos: (protected)/subscribe/page.tsx
- Auth: useUser recomendado. Datos: subscriptions.list, stripe.createCheckoutSession, stripe.createPortalSession, stripe.syncCheckoutSession.

### `/subscribe/success`

- Hace: retorno Stripe OK. Llama `stripe.syncCheckoutSession` con `session_id` para crear/activar la Subscription (no depende solo del webhook). Luego limpia `session_id`.
- Archivos: (protected)/subscribe/success/page.tsx
- Auth: sesión requerida para sincronizar el plan. Datos: stripe.syncCheckoutSession, users.me.

### `/subscribe/cancel`

- Hace: pago cancelado, sin cargo
- Archivos: (protected)/subscribe/cancel/page.tsx
- Auth: publico de facto. Datos: ninguna query.

## Admin (layout (admin)/layout.tsx: useUser, role admin o redirect /login o /)

### `/admin`

- Hace: dashboard stats calidad (huerfanas, sin poster, sin video)
- Archivos: (admin)/admin/page.tsx, admin-sidebar.tsx
- Auth: role admin. Datos: adminMovies.adminStats.

### `/admin/movies`

- Hace: CRUD películas, filtros calidad, merge, enrich TMDB
- Archivos: (admin)/admin/movies/page.tsx, movies-page-client.tsx, movie-form.tsx
- Auth: role admin + requireAdmin en mutations. Datos: adminMovies.*, movies.create/update/remove.

### `/admin/movies/new`

- Hace: alta película
- Archivos: (admin)/admin/movies/new/page.tsx
- Auth: role admin. Datos: movies.create, /api/storage/upload.

### `/admin/movies/[id]/edit`

- Hace: editar película + enrich/backdrop
- Archivos: (admin)/admin/movies/[id]/edit/page.tsx
- Auth: role admin. Datos: movies.getById, movies.update, adminEnrichment.*.

### `/admin/movies/new-releases`

- Hace: altas recientes
- Archivos: (admin)/admin/movies/new-releases/page.tsx
- Auth: role admin. Datos: adminMovies.recent.

### `/admin/series`

- Hace: CRUD tabla Series (NO alimenta /series publico)
- Archivos: (admin)/admin/series/page.tsx, series-form.tsx
- Auth: role admin. Datos: adminSeries.*.

### `/admin/series/new`

- Hace: alta Series (tabla series)
- Archivos: (admin)/admin/series/new/page.tsx
- Auth: role admin. Datos: adminSeries.create.

### `/admin/series/[id]/edit`

- Hace: editar Series + enrich TMDB
- Archivos: (admin)/admin/series/[id]/edit/page.tsx
- Auth: role admin. Datos: adminSeries.getById/update, adminSeriesEnrichment.*.

### `/admin/anime`

- Hace: CRUD anime, health proveedores, import AniList
- Archivos: (admin)/admin/anime/page.tsx, anime-form.tsx, provider-health-panel.tsx
- Auth: role admin. Datos: adminAnime.*, anime.checkProvidersHealth, anime.importCatalogBulk.

### `/admin/anime/new`

- Hace: alta anime (AniList search)
- Archivos: (admin)/admin/anime/new/page.tsx
- Auth: role admin. Datos: adminAnime.create, anime.searchAnilist.

### `/admin/anime/[id]/edit`

- Hace: editar anime + enrich
- Archivos: (admin)/admin/anime/[id]/edit/page.tsx
- Auth: role admin. Datos: adminAnime.getById/update, adminAnimeEnrichment.*.

### `/admin/tv`

- Hace: canales IPTV, probe, cleanup, populares
- Archivos: (admin)/admin/tv/page.tsx, channel-form.tsx
- Auth: role admin. Datos: tv.list, tv.probeChannel, tv.cleanupNonWorking, tv.seedPopularChannels.

### `/admin/tv/new`

- Hace: alta canal manual
- Archivos: (admin)/admin/tv/new/page.tsx
- Auth: role admin. Datos: tv.addChannel.

### `/admin/tv/[id]/edit`

- Hace: editar canal
- Archivos: (admin)/admin/tv/[id]/edit/page.tsx
- Auth: role admin. Datos: tv.getById, tv.updateChannel.

### `/admin/tv/playlists`

- Hace: playlists M3U import
- Archivos: (admin)/admin/tv/playlists/page.tsx
- Auth: role admin. Datos: tv.listPlaylists, tv.seedFromM3U, tv.createPlaylist.

### `/admin/users`

- Hace: usuarios, rol, suscripcion manual
- Archivos: (admin)/admin/users/page.tsx
- Auth: role admin. Datos: adminUsers.*.

### `/admin/plans`

- Hace: CRUD planes Stripe (incluye maxDevices)
- Archivos: (admin)/admin/plans/page.tsx, plan-form.tsx
- Auth: role admin. Datos: adminPlans.*.

### `/admin/plans/new`

- Hace: alta plan
- Archivos: (admin)/admin/plans/new/page.tsx
- Auth: role admin. Datos: adminPlans.create.

### `/admin/plans/[id]/edit`

- Hace: editar plan / stripePriceId
- Archivos: (admin)/admin/plans/[id]/edit/page.tsx
- Auth: role admin. Datos: adminPlans.getById/update.

## API

### `/api/auth/[...path]`

- Hace: Better Auth catch-all (session, sign-in, Google)
- Archivos: api/auth/[...path]/route.ts
- Auth: publico. Datos: auth().handler.
- Plan entitlements: al crear sesión se aplica `Plan.maxDevices` (ADMIN ilimitado; sin plan activo = 1). Ver AGENTS.md trampas 4b.

### `/api/auth/email-otp/send-verification-otp`

- Hace: envia OTP Resend (cooldown 30s, expira 10 min)
- Archivos: api/auth/email-otp/send-verification-otp/route.ts
- Auth: publico + cooldown. Datos: users.setOtp.

### `/api/auth/email-otp/verify-email`

- Hace: verifica OTP
- Archivos: api/auth/email-otp/verify-email/route.ts
- Auth: publico. Datos: users.verifyOtp.

### `/api/function/[name]`

- Hace: RPC: invoke query/mutation/action por nombre
- Archivos: api/function/[name]/route.ts
- Auth: por funcion (requireUser/requireAdmin). Datos: packages/db invoke + registry.

### `/api/stream/[...path]`

- Hace: sirve HLS local (.m3u8/.ts) de películas
- Archivos: api/stream/[...path]/route.ts
- Auth: denyUnlessStreamAccess. Datos: movie-stream-paths.

### `/api/stream/resolve`

- Hace: token de película -> URL de manifiesto
- Archivos: api/stream/resolve/route.ts
- Auth: denyUnlessStreamAccess. Datos: findManifestForToken.

### `/api/tv/stream/[channelId]`

- Hace: proxy HLS IPTV (rewrite m3u8)
- Archivos: api/tv/stream/[channelId]/route.ts
- Auth: denyUnlessStreamAccess. Datos: TVChannel.streamUrl.

### `/api/anime/stream`

- Hace: proxy HLS anime ?u= upstream whitelist
- Archivos: api/anime/stream/route.ts
- Auth: denyUnlessStreamAccess. Datos: anime-stream-proxy.

### `/api/stripe/webhook`

- Hace: Stripe -> stripeWebhookAction.processWebhook. Eventos: checkout.session.completed, customer.subscription.created/updated/deleted, invoice.paid / payment_succeeded / payment_failed.
- Alta compartida: packages/db/src/lib/stripe-subscription.ts (también la usa stripe.syncCheckoutSession).
- Host: Movies local. Stripe Dashboard debe usar `https://verpelis.pro/api/stripe/webhook` (túnel → localhost:3000). No Vercel.
- Archivos: api/stripe/webhook/route.ts
- Auth: firma Stripe. Datos: packages/db/src/actions/stripeWebhook.ts.

### `/api/subscriptions/stream`

- Hace: SSE invalidacion queries (LISTEN/NOTIFY)
- Archivos: api/subscriptions/stream/route.ts
- Auth: ninguna (keys de funciones). Datos: @pelis/db/realtime.

### `/api/storage/upload`

- Hace: upload multipart -> public/uploads/{id}.webp
- Archivos: api/storage/upload/route.ts
- Auth: isAdmin. Datos: @pelis/db/storage uploadFile.

### `/api/admin/tv/probe/[channelId]`

- Hace: probe online/offline de un canal
- Archivos: api/admin/tv/probe/[channelId]/route.ts
- Auth: isAdmin. Datos: probeTvStream + prisma.tVChannel.

### `/api/admin/tv/seed-popular`

- Hace: siembra canales populares
- Archivos: api/admin/tv/seed-popular/route.ts
- Auth: isAdmin. Datos: tv.seedPopularChannels.

### `/api/enrichment/*`

- Hace: preview/apply metadata y backdrops TMDB (movie)
- Archivos: api/enrichment/{enrichMovie,enrichMoviesBulk,previewMetadata,previewBackdrop,applyBackdrop,applyBackdropsBulk}/route.ts
- Auth: isAdmin. Datos: performMovieEnrichment / adminEnrichment.

### `/api/app/availability`

- Hace: version web + APK disponible
- Archivos: api/app/availability/route.ts
- Auth: publico. Datos: public/version.json, public/downloads/.

### `/uploads/[...path]`

- Hace: sirve uploads en caliente (sin restart systemd)
- Archivos: uploads/[...path]/route.ts
- Auth: publico (archivos). Datos: apps/web/public/uploads/.

## Playground (solo dev)

### `/playground`

- Hace: catálogo vivo Maison Noir. En production return null
- Archivos: playground/page.tsx
- Auth: dev only. Datos: componentes @pelis/ui, sin backend.

404: apps/web/src/app/not-found.tsx (custom).
