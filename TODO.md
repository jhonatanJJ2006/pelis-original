# TODO — Pelis Original

Lista de tareas del proyecto. Stack actual: **Next.js 14 + Postgres + `@pelis/db` + Better Auth**.

Ver auditoría completa en [`docs/AUDIT.md`](docs/AUDIT.md).

---

## Completado recientemente

- [x] Rediseño UI cinematográfico (home, películas, series, favoritos, historial)
- [x] Migración Convex → Postgres + Prisma (`@pelis/db`)
- [x] Queries: trending, por género, continuar viendo, limpiar historial
- [x] Componentes UI: `MovieRow`, `ContinueWatchingCard`, `VideoPlayer`, `EmptyState`, `MoviePoster`
- [x] Conexión imágenes: hash MD5 → `/peliculas/peliculas/{hash}.webp`
- [x] Página de perfil (`/profile`)
- [x] Búsqueda global en header (películas/series)
- [x] PWA parcial (manifest, SW Serwist, install prompt)
- [x] Panel admin CRUD (movies, series, anime, TV, users, plans)
- [x] Enrichment TMDB para películas/series/anime
- [x] Auditoría documentada en `docs/AUDIT.md`
- [x] Anime: schema `anilistId`, proveedores centralizados, fallback, import AniList
- [x] `.env.example` documentado

---

## Prioridad alta

- [ ] **Copiar pósters en entornos nuevos** — Las imágenes no van en Git. Ver `scripts/audit-images.mjs`
- [ ] **Imágenes de series** — Hashes de series faltantes en carpeta local
- [ ] **Unificar series** — Admin tabla `Series` vs público `Movie.mediaType = SERIES`
- [ ] **Reproductor de video** — Conectar `movie.token` / `videoUrl` con servidor de streaming real
- [ ] **Stripe producción** — Configurar keys reales + webhook
- [ ] **Levantar Consumet self-hosted** — `docker compose up consumet redis` (ver `docs/ANIME-PROVIDERS.md`)

---

## Backend

- [x] Proteger mutaciones admin con `requireAdmin`
- [ ] Validar payloads con `movieSchema` de `@pelis/validators`
- [x] Script de seed documentado (`pnpm --filter @pelis/db db:seed`)
- [x] Import AniList (`pnpm --filter @pelis/db import:anilist`)
- [ ] Proteger `/api/stream/*` con auth/plan activo

---

## Frontend

- [x] Página de perfil de usuario (`/profile`)
- [x] Búsqueda global en header
- [x] Búsqueda incluye anime
- [x] Anime en bottom tab bar (móvil)
- [ ] Estados de carga y error unificados en todas las páginas
- [ ] `next/image` con dominios remotos si se usan URLs externas
- [ ] Tests E2E de flujos críticos (login, favoritos, historial) — actualizar de Convex

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
- [ ] Página `not-found.tsx` custom

---

## DevOps y calidad

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
