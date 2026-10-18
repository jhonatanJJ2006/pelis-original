# @pelis/scripts-core

Utilidades puras y testeadas para los scripts CLI de `scripts/` (ADR
[`0003`](../../decisions/0003-test-cli-vitest-scripts.md)).

| Módulo    | Qué hace                                                                     |
| --------- | ---------------------------------------------------------------------------- |
| `slugify` | Tokens/nombres de archivo sin acentos (mismo criterio que `download-*.mjs`). |
| `posters` | Rutas de póster: `/peliculas/{token}.webp` y legado `/peliculas/peliculas/`. |
| `seed`    | Esquema Zod de `movies*.json` (arrays) + merge/dedupe por `token`.           |
| `tmdb`    | Normaliza un resultado de TMDB al shape del seed.                            |

Los scripts `.mjs` todavía no importan este paquete (necesitan un runtime TS como `tsx`);
la migración es gradual según ADR [`0004`](../../decisions/0004-migracion-js-ts-gradual.md).

```bash
pnpm --filter @pelis/scripts-core test
pnpm --filter @pelis/scripts-core typecheck
```
