# Architecture Audit — Pelis Original

> Auditoría de dependencias por capas (Clean Architecture) sobre `staging`.
>
> Origen: `feat/native-player-tv` (2026-10-17), que auditaba la versión Convex del repo.
> Reescrita el 2026-10-17 contra `staging` (Postgres + Prisma, sin Convex); las violaciones
> que ya no aplican se han eliminado.

## Resumen ejecutivo

- **Overall:** necesita mejora. Hay separación básica (validators / db / ui / web) pero `@pelis/ui`
  depende de la capa de datos y no existe una capa de casos de uso explícita.
- **Impacto:** las apps nativas (`apps/android-tv`, `apps/android-native`) consumen la API HTTP
  de `apps/web` con modelos Kotlin escritos a mano; cualquier cambio de shape en
  `packages/db/src/lib/shapes.ts` puede romperlas sin que lo detecte el CI.

## Mapeo actual

| Capa CA              | Carpeta                                                                              | Aislada | Notas                                   |
| -------------------- | ------------------------------------------------------------------------------------ | ------- | --------------------------------------- |
| Entities             | `packages/validators/src` (Zod), `packages/db/prisma/schema.prisma`                  | ⚠️      | Dos fuentes de verdad (ver V3)          |
| Use Cases            | `packages/db/src/{queries,mutations,actions}`                                        | ⚠️      | Mezclan orquestación con Prisma directo |
| Interface Adapters   | `packages/db/src/lib/shapes.ts`, `packages/db/src/api.ts`, `apps/web/src/app/api/**` | ✅      | RPC `POST /api/function/<name>`         |
| Frameworks & Drivers | `apps/web/src/app`, `packages/ui/src`, `packages/player/src`, apps Android           | ⚠️      | `@pelis/ui` importa `@pelis/db` (V1)    |

## Violaciones detectadas

### V1 — `@pelis/ui` depende de la capa de datos

**Severidad:** media. `packages/ui/package.json` declara `@pelis/auth` y `@pelis/db`;
`packages/ui/src/features/movie-card/index.tsx` y `packages/ui/src/features/video-player/index.tsx`
importan `@pelis/db`. La UI debería recibir datos y callbacks por props.

`@pelis/player` (nuevo) ya sigue esa regla: no importa `@pelis/db`; el progreso se entrega por
`onProgress` y lo persiste quien lo usa.

### V2 — Shapes de la API sin contrato compartido con las apps nativas

**Severidad:** media. La UI espera `_id` y enums en minúsculas (mapper `shapes.ts`). Las apps
Kotlin (`apps/android-tv/.../data/api/Models.kt`, `apps/android-native/core/.../data/Models.kt`)
replican esos shapes a mano.

### V3 — Duplicación de esquema

**Severidad:** media. `packages/validators/src/index.ts` (Zod, inputs) y
`packages/db/prisma/schema.prisma` (tablas) describen las mismas entidades por separado.

### V4 — Sin capa de casos de uso explícita

**Severidad:** baja/media. Queries/mutations/actions de `packages/db` combinan reglas de negocio
(p. ej. entitlements de plan, `maxDevices`) con acceso a Prisma.

## Regla de dependencias — diagrama actual

```
apps/web ──→ @pelis/ui ──→ @pelis/db         ⚠️ (V1)
        │             └─→ @pelis/auth ──→ @pelis/db
        │             └─→ @pelis/validators ✅
        ├─→ @pelis/db
        ├─→ @pelis/auth
        └─→ @pelis/validators
@pelis/player ──→ hls.js, react              ✅ (sin capa de datos)
apps/android-tv, apps/android-native ──HTTP──→ apps/web (/api/*)
```

## Plan priorizado

### Prioridad alta

- **A1.** Contrato de la API pública: exportar desde `packages/validators` los DTO que devuelve
  `shapes.ts` (Zod) y validarlos en tests de `packages/db`; documentar en `docs/APP.md` qué usan
  las apps nativas.
- **A2.** Sacar el acceso a `@pelis/db` de `@pelis/ui` (`movie-card`, `video-player`): pasar datos y
  callbacks por props desde `apps/web`.

### Prioridad media

- **M1.** Una sola fuente de verdad para entidades compartidas (generar Zod desde Prisma o un test
  que falle si divergen).
- **M2.** Casos de uso nombrados en `packages/db` para flujos con reglas (reproducir con plan
  activo, guardar progreso, emparejar TV).

### Prioridad baja

- **L1.** Integrar `@pelis/player` en la web detrás de un flag, reutilizando `hls-config`, HEVC y
  reanudar de `@pelis/ui` (ver ADR 0001).
- **L2.** E2E ampliados: `e2e/player.e2e.ts`, favoritos e historial.

## Cómo extender este audit

Cuando entre un paquete nuevo, actualizar el diagrama y verificar que ninguna flecha apunte desde
una capa interna hacia frameworks.
