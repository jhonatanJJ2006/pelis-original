# Flujo de ramas y PRs (Pelis)

Política vigente (2026-09-05). Si choca con otra nota, gana `AGENTS.md`.

## Reglas

1. **Nunca** commits directos a `main` ni a `staging`.
2. Todo cambio: rama nueva desde `staging` con nombre `feat/*`, `fix/*` o `chore/*`.
3. Abrir **inmediatamente** un PR hacia `staging`.
4. **Mark** auto-mergea PRs hacia **staging** (cuando el PR está listo / checks OK).
5. **Glob** **siempre** promueve **staging → main** cuando CI está verde en **test**, **build** y **format**. No hace falta OK por chat por cada promote.
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

## Resumen del flujo

```
staging ──branch──► feat|fix|chore/* ──PR──► staging ──PR──► main
                         ▲                         │
                    Mark auto-merge       Glob auto-promote
                                           (CI test+build+format)
```
