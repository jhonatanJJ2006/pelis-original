# scripts/

Scripts CLI del monorepo (datos del catálogo, pósters, TV en vivo, APKs, deploy). Están en `.mjs`
sin tipos; la migración a TypeScript es gradual, **JSDoc + `// @ts-check` primero** (ADR
[`0004`](../decisions/0004-migracion-js-ts-gradual.md)).

## Comprobación de tipos

`scripts/tsconfig.json` usa `checkJs: false`: solo se comprueban los archivos que optan con
`// @ts-check` en la primera línea (y los `.ts`). Así se migra archivo por archivo sin bloquear
el resto.

```bash
pnpm typecheck:scripts
```

## Estado de migración

| Archivo             | Estado                           |
| ------------------- | -------------------------------- |
| `vercel-ignore.mjs` | ✅ `@ts-check` + JSDoc (piloto)  |
| resto de `*.mjs`    | ⏳ pendiente (orden en ADR 0004) |

## Convención

1. Añadir `// @ts-check` y JSDoc al `.mjs`; corregir lo que marque `pnpm typecheck:scripts`.
2. Lógica pura reutilizable → `packages/scripts-core` con tests vitest adyacentes (`*.test.ts`).
3. Cuando el archivo esté 100 % tipado y sin `any`, renombrar a `.ts` y ejecutarlo con un runtime
   TS (`tsx`) — requiere añadir `tsx` como devDependency de la raíz.

## Seguridad

Varios scripts de TMDB (`download-*-posters.mjs`, `fetch-tmdb-details.mjs`,
`fix-tmdb-entries.mjs`, `link-orphan-movies.mjs`, `redownload-posters.mjs`) tienen la API key de
TMDB embebida. Pendiente: leerla de `process.env.TMDB_API_KEY` y rotar la clave.
