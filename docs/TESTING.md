# TESTING.md

Scripts en package.json raiz. Workspace Vitest: vitest.workspace.ts. Playwright: e2e/playwright.config.ts.

## Vitest (vitest.workspace.ts)

Dos proyectos:
- unit (environment node, globals): packages/validators/src/**/*.test.ts, apps/web/src/lib/**/*.test.ts (incluye `pwa-update.test.ts`), packages/ui/src/shared/**/*.test.ts, packages/ui/src/features/**/*.test.ts, packages/auth/src/**/*.test.ts, packages/db/src/**/*.test.ts (incluye `packages/db/src/lib/stripe-subscription.test.ts`: checkout → ACTIVE y no clobber por `incomplete`)
- components (jsdom, setupFiles ./test/setup.ts): packages/ui/src/**/*.test.tsx. Alias next/link y next/image a test/mocks.
  Exclude: node_modules, e2e, .next, .turbo.

pnpm test = vitest run (ambos proyectos)
pnpm test:unit / pnpm test:components / pnpm test:watch

## Playwright (e2e/playwright.config.ts)

testDir e2e/, testMatch **/*.e2e.ts. workers 1. timeout 120s.
PLAYWRIGHT_BASE_URL default http://localhost:3000.
Si la URL no es localhost, no arranca webServer.
Si es local: webServer command PORT=... node scripts/find-port.js, cwd apps/web, reuseExistingServer: !CI.
Projects: default (ignora admin-movie-preview) y admin-preview (180s, pide E2E_ADMIN_EMAIL/PASSWORD).

Archivos: smoke-pages.e2e.ts, api-smoke.e2e.ts, auth.e2e.ts, playground.e2e.ts, tv-channels.e2e.ts, admin-movie-preview.e2e.ts, email-verification.e2e.ts.

## Tests era Convex (pueden skipearse / fallar)

e2e/email-verification.e2e.ts llama npx convex data users sobre packages/convex (ya no existe). Skip si no hay RESEND_API_KEY. No es la fuente de OTP actual (Postgres User.otp).
Actualizar E2E de login/favoritos/historial sigue pendiente (TODO.md).

pnpm test:e2e / test:e2e:ui / test:smoke / test:playground / test:all
Playground E2E solo tiene sentido en development (la pagina se oculta en production).

## Ritual por tipo de cambio (para agentes)

Ver tambien AGENTS.md seccion 6.

- UI de componentes: playground + test:playground + test:components
- Pagina publica: test:smoke
- API: test:api via test:smoke (api-smoke.e2e.ts)
- Auth: e2e/auth.e2e.ts. No uses email-verification.e2e.ts (Convex).
- Admin: admin-movie-preview con E2E_ADMIN_EMAIL/PASSWORD en entorno, nunca en git.
- Prod: verpelis.pro/login con cuenta de pruebas de Webos (pedir clave, no documentarla).
