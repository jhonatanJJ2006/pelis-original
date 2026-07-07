# TODO — Pelis Original

Lista de tareas del proyecto. Actualizada tras conectar imágenes y rediseño UI.

---

## Completado recientemente

- [x] Rediseño UI cinematográfico (home, películas, series, favoritos, historial)
- [x] Schema Convex ampliado (`mediaType`, `featured`, `videoUrl`, etc.)
- [x] Queries: trending, por género, continuar viendo, limpiar historial
- [x] Componentes UI: `MovieRow`, `ContinueWatchingCard`, `VideoPlayer`, `EmptyState`, `MoviePoster`
- [x] Conexión imágenes: hash MD5 → `/peliculas/peliculas/{hash}.webp`
- [x] Pósters en `apps/web/public/peliculas/peliculas/` (gitignored)
- [x] Skills de UI/UX y arquitectura instaladas
- [x] `claude.md` con catálogo de skills

---

## Prioridad alta

- [ ] **Copiar pósters en entornos nuevos** — Las imágenes no van en Git. Ejecutar al clonar:
  ```powershell
  Copy-Item "C:\Users\ASUS\Desktop\paginas web\pelis\public\peliculas\peliculas\*.webp" `
    "apps\web\public\peliculas\peliculas\" -Force
  ```
- [ ] **Imágenes de series** — Los hashes de series no están en la carpeta local; añadir assets o definir carpeta alternativa
- [ ] **Reproductor de video** — Conectar `movie.token` / `videoUrl` con el servidor de streaming real
- [ ] **Stripe** — Implementar pagos reales (actualmente placeholder en README)
- [ ] **Panel admin** — CRUD de películas/series con subida de pósters vía `generateUploadUrl`

---

## Backend (Convex)

- [ ] Proteger `movies/create` y `movies/update` con rol `admin`
- [ ] Validar payloads con `movieSchema` de `@pelis/validators`
- [ ] Script de seed o migración documentado para catálogo inicial
- [ ] Revisar límites del plan Free de Convex (warning en deploy)
- [ ] Reiniciar `pnpm dev` si el watcher de Convex deja de sincronizar

---

## Frontend

- [ ] Página de perfil de usuario (`/profile`)
- [ ] Búsqueda global en header (actualmente solo en `/movies`)
- [ ] Estados de carga y error unificados en todas las páginas
- [ ] `next/image` con dominios remotos si se usan URLs externas
- [ ] PWA / instalable en móvil (opcional)
- [ ] Tests E2E de flujos críticos (login, favoritos, historial)

---

## UI/UX

- [ ] Auditar accesibilidad con skill `scan` o `audit`
- [ ] Pulir responsive en móvil (historial, detalle, reproductor)
- [ ] Placeholder de póster más representativo (no reutilizar un póster real)
- [ ] Animaciones reducidas con `prefers-reduced-motion`
- [ ] SEO: metadata por película/serie (`generateMetadata`)

---

## DevOps y calidad

- [ ] CI: `pnpm typecheck` + `pnpm lint` en PRs
- [ ] Documentar variables de entorno en `.env.example`
- [ ] Quitar `tsbuildinfo` del historial de Git (`git rm --cached`)
- [ ] Deploy Vercel con assets de pósters (copiar en build o CDN externo)
- [ ] Monitoreo de errores (Sentry configurado pero falló por red en dev)

---

## Ideas / backlog

- [ ] Recomendaciones personalizadas por historial
- [ ] Notificaciones de nuevos estrenos
- [ ] Múltiples perfiles por cuenta (estilo Netflix)
- [ ] Descargas offline (PWA + cache)
- [ ] Integración TMDB para metadata y pósters faltantes
- [ ] Música (el SQL legacy tenía tabla `musics`)

---

## Setup rápido (nuevo desarrollador)

```bash
pnpm install
cp .env.local .env   # editar valores
cd packages/convex && npx convex dev
# En otra terminal:
pnpm dev
# Copiar pósters (ver sección Prioridad alta)
```
