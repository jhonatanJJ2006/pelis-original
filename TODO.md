# TODO — Pelis Original

Lista de tareas del proyecto. Stack actual: **Next.js 14 + Postgres + `@pelis/db` + Better Auth**.

Ver AGENTS.md (entrada agentes) y auditoría completa en [`docs/AUDIT.md`](docs/AUDIT.md).

---

## Completado recientemente

- [x] Documentacion de agentes: AGENTS.md, docs/APP.md, docs/ARCHITECTURE.md, docs/DATA-MODEL.md, docs/TESTING.md (2026-08-29)
- [x] Rediseño UI cinematográfico (home, películas, series, favoritos, historial)
- [x] Migración Convex → Postgres + Prisma (`@pelis/db`)
- [x] Queries: trending, por género, continuar viendo, limpiar historial
- [x] Componentes UI: `MovieRow`, `ContinueWatchingCard`, `VideoPlayer`, `EmptyState`, `MoviePoster`
- [x] Conexión imágenes: hash MD5 → `/peliculas/peliculas/{hash}.webp`
- [x] Página de perfil (`/profile`)
- [x] Búsqueda global en header (películas/series)
- [x] PWA (manifest standalone, SW Serwist, modal de actualización; sin prompts de instalar ni CTAs APK en perfil/footer)
- [x] Panel admin CRUD (movies, series, anime, TV, users, plans)
- [x] Enrichment TMDB para películas/series/anime
- [x] Auditoría documentada en `docs/AUDIT.md`
- [x] Anime: schema `anilistId`, proveedores centralizados, fallback, import AniList
- [x] `.env.example` documentado
- [x] TV: scripts de auditoría/probe/cleanup (audit-tv-channels, probe-all-tv, probe-fast-tv, cleanup-tv, promote-popular)
- [x] TV: `tv.cleanupNonWorking` con dry-run + preview desde admin
- [x] TV: filtro de no-español al importar M3U (`seedFromM3U` rechaza canales brasileños/extranjeros)
- [x] TV: 1807 canales OFFLINE/no-español desactivados (2026-08-23)
- [x] TV: 35 canales populares nuevos promovidos (Pluto TV Latam, France 24, Euronews)
- [x] TV: array POPULAR en `seedPopular.ts` reescrito con feeds verificados
- [x] **Android TV fuentes en git** — `apps/android-tv/app/src/` Compose (`pro.verpelis.tv`), recuperado del APK + pairing real. Ver `apps/android-tv/README.md` (2026-09-06)
- [x] **Android TV APK v3 publicado** — `public/downloads/pelis-tv.apk` + `tv-app-version.json` code 3 / `1.2.0` (login/QR). `/api/app/availability` force-dynamic (2026-09-06)
- [x] **TWA móvil alineado a APK real** — `pelis.apk` DAL `0A:25` versionCode **2**; `app-version.json` corregido (antes decía 3 sin binario nuevo). Bump a 3+ bloqueado hasta restaurar keystore original (2026-09-06)
- [x] **TWA móvil v3 + keystore nuevo** — Keystore regenerado; `assetlinks.json` SHA `B2:9F…`; `pnpm android:publish` automatizado; contraseñas en `.env` (2026-09-06)
- [x] **TV: mapear categorías del M3U** — `scripts/map-tv-categories.mjs` ampliado (Entertainment→Entretenimiento, News, Religious, Undefined, etc.). Re-run 2026-09-06: 0 pendientes + 13 populares anime/infantil
- [x] **TV: cron de probe automático** — Units `scripts/systemd/pelis-tv-probe.{service,timer}` + `scripts/install-tv-probe-systemd.sh` (cada 6h, `--deactivate`). Instalar en Movies: `./scripts/install-tv-probe-systemd.sh`

---

## Prioridad alta

- [ ] **Copiar pósters en entornos nuevos** — Las imágenes no van en Git. Ver `scripts/audit-images.mjs`
- [ ] **Imágenes de series** — Hashes de series faltantes en carpeta local
- [ ] **Unificar series** — Admin tabla `Series` vs público `Movie.mediaType = SERIES`
- [ ] **Reproductor de video** — Conectar `movie.token` / `videoUrl` con servidor de streaming real
- [x] **Stripe: activar plan tras checkout** — `stripe.syncCheckoutSession` + webhook (`subscription.created/updated`, `invoice.paid`). No pisar ACTIVE con `incomplete`. (2026-09-05)
- [ ] **Stripe en Movies** — En la máquina Movies: webhook del Dashboard → `https://verpelis.pro/api/stripe/webhook` (túnel, no Vercel); `.env` con `STRIPE_*` del mismo modo y `SITE_URL=https://verpelis.pro`; confirmar fila `subscription` ACTIVE en Postgres local. Ver docs/AUDIT.md §5b.
- [ ] **Levantar Consumet self-hosted** — `docker compose up consumet redis` (ver `docs/ANIME-PROVIDERS.md`). 2026-09-06: Docker daemon no disponible en Movies en esta sesión.

---

## Backend

- [x] Proteger mutaciones admin con `requireAdmin`
- [x] Validar payloads con `movieSchema` de `@pelis/validators` — `movies.create` / `movies.update` y `adminSeries.create` / `adminSeries.update` (2026-09-05)
- [x] Script de seed documentado (`pnpm --filter @pelis/db db:seed`)
- [x] Import AniList (`pnpm --filter @pelis/db import:anilist`)
- [x] /api/stream* con denyUnlessStreamAccess (sesion + plan o ADMIN; no quitar)

---

## Frontend

- [x] Página de perfil de usuario (`/profile`)
- [x] Búsqueda global en header
- [x] Búsqueda incluye anime
- [x] Anime en bottom tab bar (móvil)
- [x] Estados de carga y error unificados en todas las páginas
- [x] `next/image` con dominios remotos si se usan URLs externas
- [x] Tests E2E de flujos críticos (login, favoritos, historial) — actualizar de Convex

---

## Anime

- [x] Campo `anilistId` en schema
- [x] 7 proveedores con fallback automático
- [x] Health check de proveedores (admin)
- [x] Import ~200 títulos desde AniList
- [x] Fix IDs en detalle y reproductor
- [ ] Favoritos/historial para anime
- [ ] Paginación episodios largos (500+ eps)

---

## UI/UX

- [ ] Auditar accesibilidad
- [ ] Pulir responsive en móvil (historial, detalle, reproductor)
- [ ] Placeholder de póster más representativo
- [ ] Animaciones reducidas con `prefers-reduced-motion`
- [ ] SEO: metadata por película/serie/anime (`generateMetadata`)
- [x] Pagina not-found.tsx custom

---

## DevOps y calidad

- [x] CI deploy: `prisma generate` (@pelis/db) antes de `pnpm build:vercel` (2026-09-06)
- [ ] CI: `pnpm typecheck` + `pnpm lint` en PRs
- [x] Documentar variables de entorno en `.env.example`
- [ ] Quitar `ignoreBuildErrors` de `next.config.mjs`
- [ ] Deploy con assets de pósters (copiar en build o CDN)
- [ ] Monitoreo de errores (Sentry)

---

## Ideas / backlog

- [ ] Recomendaciones personalizadas por historial
- [ ] Notificaciones de nuevos estrenos
- [ ] Múltiples perfiles por cuenta
- [ ] Descargas offline (PWA + cache)
- [ ] Música (el SQL legacy tenía tabla `musics`)

---

## Setup rápido (nuevo desarrollador)

```bash
pnpm install
cp .env.example .env   # editar valores
pnpm --filter @pelis/db db:migrate
pnpm --filter @pelis/db db:seed
# Opcional: importar catálogo anime
pnpm --filter @pelis/db import:anilist -- --limit 200
# Opcional: Consumet self-hosted
docker compose up -d consumet redis
pnpm dev
```
