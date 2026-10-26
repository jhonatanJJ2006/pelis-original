# AGENTS.md — Pelis (leeme primero)

Eres un modelo que acaba de aterrizar. No improvises. Este archivo manda. Si CONVEX.md o DEPLOY.md dicen otra cosa, gana este archivo.

## Leer primero

**Lee `docs/ESTADO-Y-DECISIONES.md` antes de tocar nada.** Es el handoff canónico: reglas, decisiones,
formatos, estilo, estado y pendientes. Registro del último día de trabajo: `docs/HANDOFF-2026-10-25.md` y `docs/HANDOFF-2026-10-25b.md`.

Reglas no negociables (detalle en ese documento):

- **Emuladores: siempre `scripts/emu-run.sh` (RAM limitada, scope propio, se apaga solo) y siempre `scripts/emu-stop.sh` al terminar.** Un emulador olvidado tumbó producción el 18-oct (OOM).

- Solo git y gh locales en la máquina Movies, como `jhonatanJJ2006`. Sin agentes en la nube de Cursor, sin force-push, sin tocar otros repos. No edites el checkout de producción: usa un worktree desde `origin/staging`.
- Ramas `feat/`, `fix/` o `chore/` (un prefijo `docs/` falla el Soft branch gate). PR a `staging`, squash-merge solo con format, test, build y Soft branch gate en verde (Vercel se ignora). Promoción `staging → main` con merge commit y luego `./scripts/deploy-prod.sh` en Movies si hay cambios de la web.
- Nunca imprimas ni commitees secretos; en la doc solo se dice dónde viven.
- Las APK solo se descargan desde la web `/descargas`; nunca dentro de las apps. El aviso de nueva versión solo existe dentro de las apps. Los pagos son solo web. Stripe sigue en TEST.
- La app de TV `apps/android-tv` (`pro.verpelis.tv`) es la principal; nada la reemplaza.
- Todo vídeo es HLS multicalidad H.264 (1080/720/480/360 + `master.m3u8`), sin borrar lo existente. Reproductores sin precarga extra.
- Copy en español llano; nunca el copy inventado de Stitch.

## 0. Primeros 2 minutos

1. Lee este archivo entero.
2. UI: DESIGN.md. Pantalla o API: docs/APP.md. Trabajo: seccion 3 y TODO.md. Elige UNA tarea.
3. No Convex. No secretos en git. No renombrar cinema-*.
4. Al terminar: seccion 6 (pruebas) y seccion 7 (actualizar doc).

**Ruta local (máquina Movies):** `/home/det/Desktop/PELIS/pelis-original`
**Producto:** streaming en español (películas, series, anime, TV en vivo) en https://verpelis.pro
**Repo:** https://github.com/jhonatanJJ2006/pelis-original.git

**UI:** Maison Noir. Fuente de verdad: DESIGN.md. Tokens cinema-* (no renombrar).

## Stack (actual)

No es Convex. Nunca Convex.

- Next.js 14 App Router: apps/web
- Postgres + Prisma: packages/db (@pelis/db)
- Better Auth: packages/db/src/auth.ts + @pelis/auth
- Stripe: planes, checkout, webhook
- Tailwind cinema-* en apps/web/tailwind.config.ts y globals.css
- Monorepo: Turborepo y Node 22
- Paquetes: @pelis/db, @pelis/ui, @pelis/auth, @pelis/validators, @pelis/email

## Cómo correr

Gestor: pnpm (no npm).

Pasos:

pnpm install
cp .env.example .env
pnpm --filter @pelis/db db:migrate
pnpm --filter @pelis/db db:seed
pnpm dev

Opcional anime:

pnpm --filter @pelis/db import:anilist -- --limit 200
pnpm --filter @pelis/db group:anime
docker compose -p pelis-original -f docker-compose.yml up -d redis consumet # hoy APAGADO: ver docs/ANIME-PROVIDERS.md

Variables: solo .env (gitignored). Nombres en .env.example. No commitear secretos. No leer .env.

## Convenciones

- Tokens cinema-*. Peligro = cinema-danger, no red-600 ni cinema-accent. Ver DESIGN.md.
- Cliente: useQuery / useMutation / useAction de @pelis/db/client con refs api (packages/db/src/api.ts).
- RPC: POST /api/function/<name>
- query: packages/db/src/queries/ (reads)
- mutation: packages/db/src/mutations/ (requireAdmin / requireUser)
- action: packages/db/src/actions/ (TMDB, Consumet, Stripe, probe TV)
- UI espera _id (no id) y enums en minúsculas. Mapper: packages/db/src/lib/shapes.ts.
- NUNCA Convex. No packages/convex. CONVEX.md es legado.

## Tests

pnpm test # vitest unit + components
pnpm test:unit # node
pnpm test:components # jsdom packages/ui
pnpm test:e2e # Playwright e2e/*.e2e.ts
pnpm test:smoke # smoke-pages + api-smoke
pnpm test:playground # /playground

Playground: /playground — catálogo vivo Maison Noir. Solo desarrollo (NODE_ENV production renderiza vacío).
Archivo: apps/web/src/app/playground/page.tsx. Detalle: docs/TESTING.md.

## Trampas

1. Series partidas. /series lee solo Movie.mediaType=SERIES (movies.listSeries). /admin/series escribe la tabla Series y, al crear o editar, copia la ficha a Movie si el token no es ya una película. listSeries ya no inventa series a partir de películas. Catálogo: `pnpm --filter @pelis/db import:tmdb-series -- --limit 40` (solo inserta; no borra usuarios ni películas).
2. Restos Convex: CONVEX.md, DEPLOY.md stale, e2e/email-verification.e2e.ts, URLs *.convex.cloud en imágenes (placeholder).
3. ignoreBuildErrors: apps/web/next.config.mjs ignora TS y ESLint en build. Build verde no implica tipos correctos.
4. Streaming y auth: /api/stream, /api/tv/stream, /api/anime/stream pasan por denyUnlessStreamAccess (sesión + plan activo o ADMIN). No quitar esa puerta. Históricamente sin auth.
   4b. Plan entitlements — sesiones concurrentes (MVP): `Plan.maxDevices` (default 1). En Better Auth `databaseHooks.session.create` se recortan sesiones no-expiradas más viejas si el usuario supera el límite. ADMIN = ilimitado; sin plan activo = 1. Claim de pairing TV crea otra Session y cuenta como dispositivo. Seed: Mensual/Básico=1, Trimestral/Estándar=2, Anual/Premium=4.
   4d. Android TV nativo: fuentes en `apps/android-tv/app/src/` (package `pro.verpelis.tv`). **No** gitignorar `app/` como en el TWA (`apps/android/app/`). Build: `apps/android-tv/README.md`. Cold start sin sesión → login estilo Netflix con QR a `/link-tv?code=` (`/api/tv-auth/*`) o correo/contraseña; con sesión → Inicio de TV 2.0 (menú lateral, catálogos, reproducción nativa Media3). Versión publicada 2.0.0 (11). El navegador de tele sigue siendo la web: middleware `/` → `/tv` si UA tele o `?device=tv`. Móvil aprueba en `/link-tv`. APK: `public/downloads/pelis-tv.apk` + `tv-app-version.json`.
   4c. Stripe: el plan se activa por webhook **y** por `POST /api/stripe/fulfill` en `/subscribe/success` (no exige cookie: `session_id` + metadata). No mapear `incomplete` a EXPIRED. Lógica: packages/db/src/lib/stripe-subscription.ts.
   Runtime **Movies local** (pelis-web + Postgres + cloudflared → verpelis.pro). No Vercel. Webhook → `https://verpelis.pro/api/stripe/webhook`. Si `SITE_URL` es localhost, los redirects usan `BETTER_AUTH_URL` público. Diagnóstico: docs/AUDIT.md §5b.
5. Posters gitignored: apps/web/public/peliculas/ y apps/web/public/uploads/. Hash MD5 32 hex -> /peliculas/peliculas/{hash}.webp. imageId -> /uploads/{id}.webp. Clone limpio = imágenes rotas.
   Ver packages/db/src/lib/resolveMovieImage.ts y scripts/audit-images.mjs.
6. PWA: no hay prompts ni barras de «instalar app» (`beforeinstallprompt` se silencia). El aviso de nueva versión **solo existe dentro de las apps** (TV, nativa, TWA); en la web `PwaUpdateModal` mantiene el SW pero no pinta el diálogo. La versión se lee del deploy local Movies (`/api/app/availability` → `public/version.json` escrito en prebuild, o SW waiting). No asumir Vercel. No montar `AppDownloadButtons` en `/profile` ni en el footer: los APK solo se ofrecen en la página web `/descargas` (archivos en `/downloads/*.apk`; `/descargar` → 308); con UA `PelisTV`/`PelisAndroid` la página dice «Ya tienes Pelis». Package TWA = `pro.verpelis.twa` (no el id legado `com.pelis.app`); Digital Asset Links en `public/.well-known/assetlinks.json`. La barra gris con URL + compartir es chrome de Chrome / Custom Tabs: no se puede ocultar con CSS. TWA/PWA standalone solo si el usuario abre el APK TWA verificado (package + SHA256) o «Añadir a pantalla de inicio». Si abre una pestaña de Chrome, la barra sigue.
7. CI `deploy` / `pnpm build:vercel`: `prisma migrate deploy` no emite el cliente. Hay que correr `prisma generate` vía `@pelis/db` (cwd `packages/db`) **antes** de `next build`. Turbo `build:vercel` depende de `^build`. No uses `pnpm -w --filter @pelis/db exec prisma generate` desde `apps/web`: el cwd no ve el schema. `DATABASE_URL` debe estar en `turbo.json` `globalEnv` o turbo strict la recorta y el prerender de `/` y `/series` falla. El job `build` (gate de promote) ya genera con `turbo run build --filter=@pelis/web...` y carga `.env` vía `with-env`. No saltar el job `deploy`.

## Deploy / entornos (Glob es dueño)

Prod hoy: https://verpelis.pro via Cloudflare Tunnel hacia localhost:3000 (systemd pelis-web.service) en la máquina **Movies**. App, Postgres y secretos son locales. No hay Vercel de producto.
DEPLOY.md está obsoleto (describe Convex). No seguirlo. Glob posee deploy/envs.

GitHub Environments (Glob, ya existen). Secretos solo en `.env` local de Movies (gitignored).

- production <-> branch main (lo que corre en Movies; no hay rama production duplicada)
- staging <-> branch staging
- dev <-> branch dev

## Git / flujo de ramas (Mark + Glob)

Fuente de verdad aquí (gana sobre notas viejas en `.github/BRANCHING.md` si chocan).

Reglas fijas:

1. **Nunca** commits directos a `main` ni a `staging`.
2. **Sin force-push.**
3. Toda rama nueva: desde `staging`, nombre `feat/*`, `fix/*` o `chore/*` (legacy `feature/*` aceptado en soft-gate).
4. Abrir PR **hacia `staging`** (no hacia `main`).

Quién hace qué:

- **Mark:** auto-mergea PRs hacia **staging** (cuando el PR está listo / checks OK). Sin cambio de política.
- **Glob:** **siempre** promueve **staging → main** cuando CI está verde en los jobs **`format`**, **`test`** y **`build`** (pipeline: format+test en paralelo → build → deploy). El job **`deploy`** existe pero no es gate de promote. No hace falta OK por chat por cada promote.

Promoción a producción = merge `staging` → `main` a cargo de Glob bajo esa regla de CI. Nadie mergea a `main` desde una feature branch.

## Mapa rápido

Catálogo (grupo (protected) = chrome, NO muro de login): / /movies /movies/[id] /series /anime /anime/[id] /anime/watch/[animeId]/[episodeNumber] /tv /tv/[id] /login /register /verify-email
Cuenta (sesión en cliente): /profile /favorites /history /subscribe /subscribe/success /subscribe/cancel /link-tv
Admin (role admin): /admin y subrutas movies/series/anime/tv/users/plans
API: /api/function/[name] (RPC), /api/auth, /api/stream, /api/tv, /api/anime, /api/stripe/webhook

Rutas completas: docs/APP.md.

## Documentación

- docs/ESTADO-Y-DECISIONES.md — handoff canónico (leer primero)
- docs/HANDOFF-2026-10-18.md — registro del 2026-10-17/18
- docs/HANDOFF-2026-10-19.md — registro del 2026-10-19
- docs/HANDOFF-2026-10-24.md — registro del 2026-10-24 (hero dinámico, TV 2.0.3)
- docs/HANDOFF-2026-10-25.md — registro del 2026-10-25 (pulido del hero, TV 2.0.4)
- docs/HANDOFF-2026-10-25b.md — intro con sonido y banner de TV más grande (TV 2.0.5)
- docs/HANDOFF-2026-10-25c.md — app nativa del celular 1.2.3: reproductor, sin conexión, sinopsis, rotación
- docs/HANDOFF-2026-10-25d.md — nativa 1.2.4 (muro de planes, invitado) y TV 2.0.6
- DESIGN.md — UI Maison Noir (tokens cinema-*)
- docs/APP.md — rutas, auth, fuentes de datos
- docs/ARCHITECTURE.md — paquetes, flujo, trampas
- docs/DATA-MODEL.md — Prisma
- docs/TESTING.md — Vitest + Playwright
- docs/ANIME-PROVIDERS.md — embeds / AniList / Consumet (apagado)
- docs/TRANSCODE-ABR.md, docs/TRANSCODE-ABR-PILOT-2026-10-18.md — formato HLS multicalidad obligatorio
- docs/HLS-NGINX-PLAN.md — nginx secure_link (decidido: no por ahora)
- docs/AUDIT.md — gaps vivos
- TODO.md — backlog
- CONVEX.md — legado, no usar
- .github/BRANCHING.md — flujo de ramas (detalle; esta sección Git manda si hay conflicto)
- DEPLOY.md — stale, Glob posee deploy

## 2. Duenos

- Mark: docs, DESIGN.md, playground, e2e, UI Maison Noir; auto-merge de PRs a **staging**.
- Glob: environments y ramas; promote automático **staging → main** si CI jobs **`format`**+**`test`**+**`build`** verdes (`deploy` es post-merge, no gate). No toca AGENTS.md ni playground/e2e.
- Webos: canales y cuenta de pruebas. Sergi: reproductores. Bob: login. Leo: conectores.

## 3. Por donde continuar

Hecho: Convex migrado, Maison Noir, 404, playground, smoke e2e, vitest, stream con plan, docs base, Stripe checkout → Subscription ACTIVE (sync + webhook).

Pendiente ALTO:

1. Unificar series del todo (el alta admin ya copia a Movie.mediaType SERIES; borrar en admin no quita la ficha pública a propósito).
2. E2E login, favoritos, historial (email-verification.e2e.ts asume Convex).
3. Posters en clones nuevos (carpetas gitignored).
4. Stripe en Movies: endpoint webhook al túnel + `.env` local (el código ya activa el plan). Consumet estable. Cron probe TV. Categorias M3U en espanol.

Pendiente calidad: loading/error, reduced-motion, a11y, responsive, SEO, favoritos anime, paginar episodios, CI, Sentry.

No hagas salvo pedido: reescribir players, inventar environments, redibujar forms admin.

## 4. Bien vs mal

BIEN: seguir DESIGN.md. Una tarea a la vez. Tests antes de listo. Copy en espanol.
BIEN tambien: no renombrar cinema-*. Peligro usa cinema-danger. Stream exige plan. Actualiza TODO y AUDIT si un gap cambia.

MAL: Convex. Coral Netflix. Bebas Neue. cinema-accent para peligro. Quitar el gate de stream. Creer que admin/series llena /series. Subir secretos o sesiones tmp. Tratar el build verde como tipos correctos. Skills de NYC, zoning, EPD o vault en este repo.

## 5. Skills que SI puedes usar

Lee el SKILL.md de la carpeta antes de aplicarla. Catalogo completo: claude.md.
Si no sabes cual: studio o skills-menu (.agents/skills/).
UI: ui-ux-pro-max, frontend-design, design-taste-frontend, high-end-visual-design, redesign-existing-projects, web-design-guidelines, ui-styling, design-system.
A11y: scan, diff, audit.
Arquitectura: clean-architecture, kent-beck-style, the-architect, system-architecture, decision, project-dossier.

No uses: industrial-brutalist, NYC, zoning, EPD, vault de Dave, slides salvo que pidan un deck.

## 6. Como probar cada cambio

Local: servidor de desarrollo en puerto 3000. Playground en /playground (solo dev).
Unit+componentes: script test del root. Unit: test:unit. UI: test:components.
E2E: test:e2e. Humo de paginas+API: test:smoke. Playground: test:playground.
PLAYWRIGHT_BASE_URL por defecto localhost:3000. Reusa el servidor si ya corre.
Si cambias UI: abre /playground y el smoke. Si cambias auth: auth.e2e.ts. Si cambias API: api-smoke.e2e.ts.
email-verification.e2e.ts asume Convex: no lo uses como verdad. Skip.
Prod: https://verpelis.pro/login. Hay cuenta ADMIN de pruebas (Webos). Pide la clave a Webos o Mark. NUNCA la escribas en el repo.
Admin e2e: admin-movie-preview pide E2E_ADMIN_EMAIL y PASSWORD en el entorno, no en git.

## 7. Cuando actualizar esta doc

Actualiza AGENTS.md, TODO.md y docs/AUDIT.md si: cierras un gap, descubres una trampa nueva, cambias una ruta, cambias auth de stream, cambias tokens, anades un test, o Glob mueve environments.
Fecha en AUDIT.md. No marques hecho lo que no corriste. No pongas secretos.
