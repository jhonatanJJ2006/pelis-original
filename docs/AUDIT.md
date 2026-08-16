# Auditoría del sitio — Pelis Original

Documento vivo con el inventario de gaps, bugs e incompletitudes.  
Última actualización: 2026-08-16.

---

## Resumen ejecutivo

| Área | Estado | Notas |
|------|--------|-------|
| Catálogo películas | OK | Filtros, búsqueda, detalle |
| Catálogo series | Crítico | Admin `Series` ≠ público `Movie.mediaType` |
| Anime catálogo | OK | CRUD admin, listado |
| Anime streaming | En reparación | IDs incorrectos + API Consumet inestable |
| TV en vivo | OK | IPTV, probe admin |
| Auth | OK | Better Auth + Google |
| Suscripción | Parcial | Stripe requiere keys reales |
| PWA | Parcial | SW precache problemático |
| Imágenes | Alto | Pósters hash faltantes en clone limpio |
| CI / calidad | Bajo | Sin CI, build ignora TS/lint |

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

**Acción pendiente:** Validar sesión/plan activo en middleware o route handler.

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

### 11. Admin anime: providers JSON vs streaming

**Síntoma:** Campo `providers` en BD es informativo; no controla reproducción.

**Acción:** Documentado en `docs/ANIME-PROVIDERS.md`. Streaming usa proveedores centralizados en `anime-providers.ts`.

---

## Bajo

| Issue | Archivo | Estado |
|-------|---------|--------|
| Sin `not-found.tsx` custom | `apps/web/src/app/` | Pendiente |
| Sin CI en GitHub Actions | `.github/workflows/` | Pendiente |
| Sin monitoreo Sentry activo | — | Pendiente |
| E2E roto (referencia Convex) | `e2e/email-verification.e2e.ts` | Pendiente |
| Sin favoritos/historial anime | schema | Pendiente |
| Sin SEO `generateMetadata` | páginas detalle | Pendiente |

---

## Matriz de features

| Feature | Estado |
|---------|--------|
| Home + carruseles | Completo |
| Catálogo películas | Completo |
| Catálogo series | Roto/desalineado |
| Detalle película + player | Completo |
| Detalle serie | Parcial (sin episodios) |
| Anime catálogo | Completo |
| Anime reproducción | En reparación |
| TV en vivo | Completo |
| Favoritos / Historial | Completo (solo películas) |
| Perfil | Completo |
| Auth | Completo |
| Stripe suscripción | Parcial |
| Admin CRUD | Completo |
| PWA | Parcial |
| Tests E2E | Parcial (rotos) |

---

## Dependencias externas

| Servicio | Uso | Riesgo |
|----------|-----|--------|
| Consumet API | Episodios/video anime | Alta — auto-hospedar |
| AniList GraphQL | Metadata anime | Baja — gratis |
| TMDB | Enrichment posters | Media — requiere API key |
| Stripe | Pagos | Media — requiere config |
| Paths locales streaming | Películas | Alta — específico del servidor |

---

## Cómo mantener este documento

1. Al cerrar un issue, mover de "Pendiente" a "Corregido" con fecha.
2. Nuevos bugs: añadir fila con severidad y archivos clave.
3. Revisar mensualmente items "En progreso".
