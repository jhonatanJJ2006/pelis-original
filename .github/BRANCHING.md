# Flujo de ramas y PRs (Pelis)

Política vigente (2026-09-05). Si choca con otra nota, gana `AGENTS.md`.

## Reglas

1. **Nunca** commits directos a `main` ni a `staging`.
2. Todo cambio: rama nueva desde `staging` con nombre `feat/*`, `fix/*` o `chore/*`.
3. Abrir **inmediatamente** un PR hacia `staging`.
4. **Mark** auto-mergea PRs hacia **staging** (cuando el PR está listo / checks OK).
5. **Glob** **siempre** promueve **staging → main** cuando CI está verde en **format**, **test** y **build** (jobs en `.github/workflows/ci.yml`). El job **deploy** corre solo en `push` a `main`/`staging` (post-merge); no es gate de promote. No hace falta OK por chat por cada promote.
6. **Sin force-push.**

## Entornos GitHub

| Entorno     | Rama      |
|-------------|-----------|
| Production  | `main`    |
| Staging     | `staging` |
| Dev         | `dev`     |

## Nombres de rama

- `feat/<descripcion-corta>` — nueva funcionalidad
- `fix/<descripcion-corta>` — corrección
- `chore/<descripcion-corta>` — docs, CI, mantenimiento
- Legacy: `feature/*` también se acepta en el soft-gate

## Soft-gate (GitHub Actions)

El workflow `.github/workflows/branch-gate.yml` valida el destino del PR:

- PR a `main` → solo desde `staging` (promoción)
- PR a `staging` → solo desde `feat/*`, `fix/*`, `chore/*` (o `feature/*`)

**Limitación (plan Free):** sin GitHub Pro / rulesets con required status checks, este check es **asesor** (soft-gate): falla en la UI pero **no bloquea** el merge por sí solo. Cuando haya required checks disponibles, se puede endurecer.

## CI (format / test / build / deploy)

Workflow: `.github/workflows/ci.yml`

| Job | Cuándo | Rol |
|-----|--------|-----|
| `format` | PR + push | Prettier check (`pnpm format`) |
| `test` | PR + push | Unit tests (`pnpm test:unit`) — paralelo con format |
| `build` | PR + push | Turbo build; needs format+test |
| `deploy` | solo push a main/staging | `prisma generate` (@pelis/db) + `pnpm build:vercel` (no SSH a Movies) |

**Promote staging→main:** requiere **format + test + build** verdes. Deploy es post-merge.

## Resumen del flujo

```
staging ──branch──► feat|fix|chore/* ──PR──► staging ──PR──► main
                         ▲                         │
                    Mark auto-merge       Glob auto-promote
                                           (CI format+test+build)
```
