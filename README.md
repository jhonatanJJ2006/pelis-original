# Pelis App

Plataforma de streaming de películas reconstruida con Next.js 14, TypeScript, Convex y Tailwind CSS.

## Tech Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Backend**: Convex (database + functions)
- **Auth**: Better Auth + Google OAuth
- **Payments**: Stripe (placeholder)
- **State**: Zustand + TanStack Query
- **Monorepo**: Turborepo + pnpm

## Estructura del Proyecto

```
pelis-original/
├── apps/
│   └── web/                    # Next.js frontend
├── packages/
│   ├── convex/                 # Convex backend (schema, functions)
│   ├── ui/                    # Componentes compartidos
│   ├── auth/                  # Auth hooks y store
│   ├── validators/            # Zod schemas
│   └── email/                 # Resend email adapter
├── tooling/
│   ├── eslint/                # ESLint configs
│   ├── tailwind/              # Tailwind configs
│   ├── typescript/            # TypeScript configs
│   └── prettier/              # Prettier configs
├── turbo.json
├── pnpm-workspace.yaml
└── package.json
```

## Getting Started

### 1. Instalar dependencias

```bash
pnpm install
```

### 2. Configurar variables de entorno

Crear `.env` en la raíz:

```env
DATABASE_URL=postgresql://...
BETTER_AUTH_SECRET=your_secret
RESEND_API_KEY=re_...
NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud
AUTH_GOOGLE_ID=...
AUTH_GOOGLE_SECRET=...
```

### 3. Deploy Convex

```bash
cd packages/convex
npx convex deploy
```

### 4. Ejecutar en desarrollo

```bash
pnpm dev
```

## Scripts

```bash
pnpm dev          # Desarrollo
pnpm build        # Build producción
pnpm lint         # ESLint
pnpm typecheck    # TypeScript check
```

## Deployment

### Convex

```bash
cd packages/convex && npx convex deploy
```

### Vercel

```bash
pnpm build:vercel
```

## Licencia

ISC
