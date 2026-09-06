import { expect, type Page } from '@playwright/test';

export function getE2ECredentials(): { email: string; password: string } | null {
  const email = process.env.PELIS_TEST_USER_EMAIL || process.env.E2E_USER_EMAIL;
  const password = process.env.PELIS_TEST_USER_PASSWORD || process.env.E2E_USER_PASSWORD;
  if (email && password) return { email, password };
  return null;
}

export function canProvisionTestUser(): boolean {
  return Boolean(getE2ECredentials() || process.env.DATABASE_URL);
}

export async function loginViaUi(page: Page, email: string, password: string) {
  await page.goto('/login');
  await expect(page.getByRole('heading', { name: /iniciar sesión/i })).toBeVisible();
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel('Contraseña', { exact: true }).fill(password);
  await page.getByRole('button', { name: /iniciar sesión/i }).click();
  await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 30_000 });
}

async function markEmailVerified(email: string) {
  const { createRequire } = await import('node:module');
  const { join } = await import('node:path');
  const require = createRequire(join(process.cwd(), 'packages/db/package.json'));
  const { Client } = require('pg') as typeof import('pg');
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    await client.query(
      'UPDATE "user" SET "emailVerified" = true, "verifiedAt" = NOW() WHERE email = $1',
      [email.toLowerCase()]
    );
  } finally {
    await client.end();
  }
}

export async function ensureLoggedIn(page: Page) {
  const envCreds = getE2ECredentials();
  if (envCreds) {
    await loginViaUi(page, envCreds.email, envCreds.password);
    return envCreds;
  }

  if (!process.env.DATABASE_URL) {
    throw new Error(
      'Set PELIS_TEST_USER_EMAIL + PELIS_TEST_USER_PASSWORD (or E2E_USER_*) or DATABASE_URL'
    );
  }

  const email = `e2e-${Date.now()}@example.com`;
  const password = 'Test123456';
  const res = await page.request.post('/api/auth/sign-up/email', {
    data: { name: 'E2E User', email, password },
  });
  if (!res.ok()) {
    throw new Error(`sign-up failed: ${res.status()} ${await res.text()}`);
  }
  await markEmailVerified(email);
  await page.context().clearCookies();
  await loginViaUi(page, email, password);
  return { email, password };
}

export async function fetchFirstMovie(page: Page): Promise<{ _id: string; name: string } | null> {
  const res = await page.request.post('/api/function/movies.list', {
    data: { mediaType: 'movie', limit: 1 },
  });
  if (!res.ok()) return null;
  const body = (await res.json()) as Array<{ _id?: string; name?: string }>;
  const movie = Array.isArray(body) ? body[0] : null;
  if (!movie?._id || !movie.name) return null;
  return { _id: movie._id, name: movie.name };
}
