# 0003 — Tests con vitest para los scripts CLI

- **Status:** decided — revisada el 2026-10-17 contra `staging`
- **Date:** 2026-10-17
- **Deciders:** equipo Pelis

## Context

`scripts/` tiene ~45 scripts `.mjs` (TMDB, pósters, seed, TV en vivo, APKs, deploy) y solo uno
con test (`apply-twa-apk-update.test.mjs`). El repo ya usa vitest con un workspace
(`vitest.workspace.ts`, proyectos `unit` y `components`) que CI ejecuta en el job `test`.

## Options considered

1. **Vitest para todos los scripts** — cobertura completa en CI.
2. **Solo scripts de infraestructura** — `android-*`, `vercel-ignore`, `publish-apks`.
3. **Solo utilidades puras** — sin side effects (parsers, transformers, validadores).
4. **Sin tests, solo typecheck.**

## Decision

Objetivo: opción 1. Camino: extraer la lógica pura a `packages/scripts-core/` (opción 3 como
primer paso) y dejar los `.mjs` como entrypoints delgados. Red (TMDB) con `fetch` mockeado; FS
con directorios temporales.

## Consequences

- `packages/scripts-core/`: `slugify`, rutas de pósters, esquema del seed (arrays de
  `movies*.json`), normalización TMDB, con tests `*.test.ts` incluidos en el proyecto `unit`.
- Los `.mjs` aún no importan `scripts-core`: hace falta un runtime TS (`tsx`) o compilar el
  paquete. Se hará script a script (ADR 0004).
- Coste estimado: 1–2 días por bloque de scripts.
