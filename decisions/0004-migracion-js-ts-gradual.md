# 0004 — Migración gradual JS→TS con JSDoc primero

- **Status:** decided — revisada el 2026-10-17 contra `staging`
- **Date:** 2026-10-17
- **Deciders:** equipo Pelis

## Context

Los ~45 scripts de `scripts/` están en `.mjs` sin tipos. Tipar todo de golpe bloquearía otras
tareas. Debe encajar con ADR 0003.

## Options considered

1. **Gradual archivo por archivo, JSDoc primero** — `// @ts-check` + JSDoc en cada `.mjs`,
   renombrar a `.ts` cuando esté tipado.
2. **Big-bang con `tsx`** — convertir todo a la vez.
3. **Mantener JS, solo JSDoc.**
4. **Migrar solo los de CI/build.**

## Decision

Opción 1. Orden:

1. `vercel-ignore.mjs` (hecho: `@ts-check`, JSDoc y `require` → `import`).
2. `generate-pwa-icons.mjs`, `write-version.mjs`.
3. `android-fingerprint.mjs`, `android-build.mjs`, `android-tv-build.mjs`, `publish-apks.mjs`.
4. Scripts de datos: `generate-posters`, `download-tmdb-posters`, `fetch-tmdb-details`,
   `fix-tmdb-entries`, `generate-seed`, `append-*`, `redownload-posters`, `download-*-posters`,
   `update-seed-images`, `link-orphan-movies`, TV (`probe-*`, `cleanup-tv*`).

Cada archivo gana `// @ts-check` + JSDoc; cuando está 100 % tipado sin `any`, se renombra a `.ts`.

## Consequences

- `scripts/tsconfig.json` extiende `tooling/typescript/base.json` con `allowJs` y
  `checkJs: false`: solo se comprueban los archivos con `// @ts-check`. Comando:
  `pnpm typecheck:scripts` (también en el job `test` de CI).
- Al pasar a `.ts`, los comandos `node scripts/*.mjs` de `package.json` pasan a `tsx scripts/*.ts`
  (añadir `tsx`).
- Riesgo: si la migración se estanca queda deuda explícita; seguirla en `TODO.md`.
