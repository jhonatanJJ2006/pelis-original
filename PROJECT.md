# Project Dossier — Pelis Original

> Hechos verificables. El razonamiento vive en `decisions/`. Cada entrada lleva fuente y fecha.
> Si algo choca con `AGENTS.md`, gana `AGENTS.md`.
>
> Portado de `feat/native-player-tv` y revisado contra `staging` el 2026-10-17.

## Identidad

| Campo      | Valor                                                               | Fuente      | Fecha      |
| ---------- | ------------------------------------------------------------------- | ----------- | ---------- |
| Proyecto   | Pelis — streaming en español (películas, series, anime, TV en vivo) | `AGENTS.md` | 2026-10-17 |
| Producción | https://verpelis.pro                                                | `AGENTS.md` | 2026-10-17 |
| Repo       | https://github.com/jhonatanJJ2006/pelis-original                    | `AGENTS.md` | 2026-10-17 |
| Ruta prod  | `/home/det/Desktop/PELIS/pelis-original` (máquina **Movies**)       | `AGENTS.md` | 2026-10-17 |
| UI         | Maison Noir (tokens `cinema-*`, fuente de verdad `DESIGN.md`)       | `DESIGN.md` | 2026-10-17 |

## Stack

| Item            | Valor                                                        | Fuente                               | Fecha      |
| --------------- | ------------------------------------------------------------ | ------------------------------------ | ---------- |
| Frontend        | Next.js 14 (App Router) + TypeScript + Tailwind              | `apps/web/package.json`              | 2026-10-17 |
| Datos           | Postgres + Prisma (`@pelis/db`). **No Convex.**              | `AGENTS.md`, `packages/db/prisma/`   | 2026-10-17 |
| Auth            | Better Auth 1.4.9 (`packages/db/src/auth.ts`, `@pelis/auth`) | `apps/web/package.json`, `AGENTS.md` | 2026-10-17 |
| Pagos           | Stripe (checkout, webhook, `/api/stripe/fulfill`)            | `AGENTS.md`                          | 2026-10-17 |
| Email           | Resend (`@pelis/email`)                                      | `apps/web/package.json`              | 2026-10-17 |
| Reproductor web | hls.js 1.6.16 en `@pelis/ui/features/video-player`           | `packages/ui/package.json`           | 2026-10-17 |
| PWA             | Serwist 8                                                    | `apps/web/package.json`              | 2026-10-17 |
| Monorepo        | Turborepo + pnpm 9.15.4                                      | `package.json`                       | 2026-10-17 |
| Runtime         | Node 22 (`.nvmrc` 22.11.0)                                   | `package.json`, `.nvmrc`             | 2026-10-17 |

## Layout del repo

| Ruta                     | Propósito                                                                                                                    | Fecha      |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------- | ---------- |
| `apps/web/`              | Next.js (web, API `/api/*`, RPC `POST /api/function/<name>`)                                                                 | 2026-10-17 |
| `apps/android/`          | TWA Bubblewrap, package `pro.verpelis.twa`                                                                                   | 2026-10-17 |
| `apps/android-tv/`       | App Android TV nativa publicada, package `pro.verpelis.tv` (Compose for TV, Media3, login QR/correo, aviso de actualización) | 2026-10-17 |
| `apps/android-native/`   | Apps nativas Kotlin/Compose en desarrollo: `core`, `phone` (`pro.verpelis.app.native`), `tv` (`pro.verpelis.tv.native`)      | 2026-10-17 |
| `packages/db/`           | Prisma schema, queries / mutations / actions, Better Auth                                                                    | 2026-10-17 |
| `packages/ui/`           | Componentes compartidos, incluido el reproductor de producción                                                               | 2026-10-17 |
| `packages/auth/`         | Hooks/cliente de auth                                                                                                        | 2026-10-17 |
| `packages/validators/`   | Esquemas Zod                                                                                                                 | 2026-10-17 |
| `packages/email/`        | Adaptador Resend                                                                                                             | 2026-10-17 |
| `packages/player/`       | Reproductor HTML5 + hls.js + Cast/AirPlay + mando TV (aditivo, sin conectar)                                                 | 2026-10-17 |
| `packages/scripts-core/` | Utilidades puras testeadas para `scripts/`                                                                                   | 2026-10-17 |
| `scripts/`               | ~45 scripts `.mjs` (catálogo, pósters, TV, APKs, deploy)                                                                     | 2026-10-17 |
| `tooling/`               | Configs eslint / prettier / tailwind / typescript                                                                            | 2026-10-17 |
| `e2e/`                   | Playwright                                                                                                                   | 2026-10-17 |

## Estado de herramientas

| Item              | Valor                                                                                                                                                                                                           | Fuente                     | Fecha      |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- | ---------- |
| Format            | `pnpm format` (Prettier 3.9.5, `tooling/prettier`, printWidth 100) — gate de CI                                                                                                                                 | `.github/workflows/ci.yml` | 2026-10-17 |
| Tests unit        | `pnpm test:unit` (vitest workspace, proyecto `unit`) — gate de CI                                                                                                                                               | `vitest.workspace.ts`      | 2026-10-17 |
| Tests componentes | `pnpm test:components` (jsdom)                                                                                                                                                                                  | `vitest.workspace.ts`      | 2026-10-17 |
| E2E               | `pnpm test:e2e` (Playwright)                                                                                                                                                                                    | `package.json`             | 2026-10-17 |
| Typecheck         | `pnpm typecheck` **falla** hoy (paquetes sin `tsconfig.json`: `validators`, `email`, `ui`). `next.config.mjs` ignora errores TS en build. CI solo comprueba `@pelis/player`, `@pelis/scripts-core` y `scripts/` | local, `AGENTS.md`         | 2026-10-17 |
| Lint              | `pnpm lint` **falla** hoy (ESLint 9 sin `eslint.config.*` en los paquetes). No es gate de CI                                                                                                                    | local                      | 2026-10-17 |
| CI                | `ci.yml`: `format` + `test` → `build` → `deploy`; `branch-gate.yml`: `Soft branch gate`                                                                                                                         | `.github/workflows/`       | 2026-10-17 |

## Entidades (Prisma)

`User`, `Session`, `Account`, `Verification`, `Movie` (`mediaType` `MOVIE`/`SERIES`), `Series`,
`Anime`, `TVChannel`, `TVPlaylist`, `Plan`, `Subscription`, `Favorite`, `History`, `TvPairing`,
`RateLimitHit` — `packages/db/prisma/schema.prisma`, 2026-10-17.

## Deploy / runtime

| Item           | Valor                                                                                                   | Fuente                             | Fecha      |
| -------------- | ------------------------------------------------------------------------------------------------------- | ---------------------------------- | ---------- |
| Producción     | https://verpelis.pro → Cloudflare Tunnel → `localhost:3000` en **Movies** (systemd `pelis-web.service`) | `AGENTS.md`                        | 2026-10-17 |
| Datos/secretos | Postgres y `.env` locales en Movies (gitignored)                                                        | `AGENTS.md`                        | 2026-10-17 |
| Vercel         | **No** es producción. `vercel.json` + `scripts/vercel-ignore.mjs` son legado                            | `AGENTS.md`                        | 2026-10-17 |
| Ramas          | `feat/*`/`fix/*`/`chore/*` → PR a `staging`; `staging` → `main` (promote) lo hace Glob                  | `AGENTS.md`                        | 2026-10-17 |
| APKs           | Página `/descargas`: `/downloads/pelis.apk` (TWA) y `/downloads/pelis-tv.apk` (TV)                      | `apps/web/src/lib/app-download.ts` | 2026-10-18 |

## Prioridades abiertas (snapshot)

- Integrar `@pelis/player` detrás de un flag sin perder los fixes HLS/HEVC de producción → ADR 0001.
- Apps nativas: `apps/android-tv` publicada; `apps/android-native` en desarrollo → ADR 0002.
- Tests de scripts vía `packages/scripts-core` → ADR 0003.
- Migración JS→TS gradual de `scripts/` → ADR 0004.

## Decisiones

| #    | Decisión                                                          | Estado                 | Fecha      |
| ---- | ----------------------------------------------------------------- | ---------------------- | ---------- |
| 0001 | Player HTML5 + hls.js + Cast/AirPlay + mando TV (paquete aditivo) | decided (revisada)     | 2026-10-17 |
| 0002 | Apps Android TV en Kotlin + Compose for TV                        | implemented (revisada) | 2026-10-17 |
| 0003 | Tests vitest para scripts vía utilidades puras                    | decided (revisada)     | 2026-10-17 |
| 0004 | Migración JS→TS gradual con JSDoc primero                         | decided (revisada)     | 2026-10-17 |
