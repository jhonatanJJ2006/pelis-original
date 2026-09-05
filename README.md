# Pelis App

Plataforma de streaming de películas, series, anime y TV en vivo.  
Stack: **Next.js 14 + Postgres + `@pelis/db` + Better Auth**.

## Tech Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Backend**: Postgres + Prisma (`@pelis/db`)
- **Auth**: Better Auth + Google OAuth
- **Payments**: Stripe
- **Anime streaming**: Consumet API (self-hosted o pública)
- **Monorepo**: Turborepo + pnpm

## Estructura del Proyecto

```
pelis-original/
├── apps/web/              # Next.js frontend
├── packages/db/           # Backend Postgres + Prisma
├── packages/ui/           # Componentes compartidos
├── packages/auth/         # Auth hooks y store
├── packages/validators/   # Zod schemas
├── docker/consumet/       # Consumet self-hosted
├── docs/                  # Auditoría y guías
└── docker-compose.yml     # Consumet + Redis
```

## Getting Started

### 1. Instalar dependencias

```bash
pnpm install
```

### 2. Configurar variables de entorno

```bash
cp .env.example .env
# Editar DATABASE_URL, BETTER_AUTH_SECRET, etc.
```

### 3. Base de datos

```bash
pnpm --filter @pelis/db db:migrate
pnpm --filter @pelis/db db:seed
```

### 4. Anime (opcional)

```bash
# Importar ~200 títulos desde AniList
pnpm --filter @pelis/db import:anilist -- --limit 200

# Levantar Consumet self-hosted para streaming
docker compose up -d redis consumet
```

Ver [`docs/ANIME-PROVIDERS.md`](docs/ANIME-PROVIDERS.md) para troubleshooting.

### 5. Desarrollo

```bash
pnpm dev
```

## Scripts

```bash
pnpm dev                              # Desarrollo
pnpm build                            # Build producción
pnpm lint                             # ESLint
pnpm typecheck                        # TypeScript check
pnpm --filter @pelis/db db:migrate    # Migraciones
pnpm --filter @pelis/db import:anilist # Import catálogo anime
docker compose up -d consumet redis   # Consumet self-hosted
```

## Documentación

- [`AGENTS.md`](AGENTS.md) — entrada para agentes
- [`DESIGN.md`](DESIGN.md) — UI Maison Noir (tokens cinema-*)
- [`docs/APP.md`](docs/APP.md) — rutas, auth, datos
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — paquetes y flujo
- [`docs/DATA-MODEL.md`](docs/DATA-MODEL.md) — Prisma
- [`docs/TESTING.md`](docs/TESTING.md) — Vitest + Playwright
- [`docs/ANIME-PROVIDERS.md`](docs/ANIME-PROVIDERS.md) — anime / Consumet
- [`docs/AUDIT.md`](docs/AUDIT.md) — gaps vivos
- [`TODO.md`](TODO.md) — backlog
- [`CONVEX.md`](CONVEX.md) — legado, no usar

## Deployment

`DEPLOY.md` esta obsoleto (describe Convex). Prod hoy: https://verpelis.pro via Cloudflare Tunnel hacia localhost:3000 (systemd pelis-web.service). Glob posee deploy/envs. Ver AGENTS.md.

