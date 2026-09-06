import { test, expect } from '@playwright/test';

/**
 * Smoke E2E: recorre todas las páginas públicas de la app y verifica que
 * renderizan sin errores de consola. Corre contra localhost:3000 o
 * PLAYWRIGHT_BASE_URL.
 */

const PAGES: Array<{ path: string; heading: RegExp; requireData?: boolean }> = [
  { path: '/', heading: /cine de sala oscura|películas y series destacadas/i },
  { path: '/movies', heading: /películas/i, requireData: true },
  { path: '/series', heading: /series/i },
  { path: '/anime', heading: /anime/i, requireData: true },
  { path: '/tv', heading: /tv en vivo/i, requireData: true },
  { path: '/login', heading: /iniciar sesión/i },
  { path: '/register', heading: /crear cuenta/i },
  { path: '/verify-email', heading: /enlace inválido|verifica tu email/i },
];

test.describe('Smoke — páginas públicas', () => {
  for (const { path, heading, requireData } of PAGES) {
    test(`${path} carga sin errores`, async ({ page }) => {
      const consoleErrors: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
      });

      const response = await page.goto(path, { waitUntil: 'domcontentloaded' });
      expect(response?.status()).toBeLessThan(400);

      const h1 = page.locator('h1').first();
      await expect(h1).toBeVisible({ timeout: 20000 });
      await expect(h1).toContainText(heading);

      if (requireData) {
        await expect(page.locator('body a, body button').first()).toBeAttached({
          timeout: 20000,
        });
      }

      const fatalErrors = consoleErrors.filter(
        (e) =>
          !e.includes('Failed to load resource') &&
          !e.includes('favicon') &&
          !e.includes('net::ERR')
      );
      expect(fatalErrors).toEqual([]);
    });
  }
});

test.describe('Smoke — catálogo con datos', () => {
  test('películas muestra cards enlazadas al detalle', async ({ page }) => {
    await page.goto('/movies');
    await expect(page.getByRole('heading', { name: /películas/i })).toBeVisible();
    const card = page.locator('a[href^="/movies/"]').first();
    await expect(card).toBeVisible({ timeout: 20000 });
  });

  test('una película del catálogo abre su página de detalle', async ({ page }) => {
    await page.goto('/movies');
    const card = page.locator('a[href^="/movies/"]').first();
    await expect(card).toBeVisible({ timeout: 20000 });
    const href = await card.getAttribute('href');
    await card.click();
    await page.waitForURL(new RegExp(`^.*${href?.replace(/^\//, '/')}$`), { timeout: 30000 });
    await expect(page.locator('main h1, main h2').first()).toBeVisible({ timeout: 30000 });
  });

  test('TV en vivo muestra canales', async ({ page }) => {
    await page.goto('/tv');
    await expect(page.getByRole('heading', { name: /tv en vivo/i })).toBeVisible();
    const channel = page.locator('a[href^="/tv/"]').first();
    await expect(channel).toBeVisible({ timeout: 20000 });
  });
});

test.describe('Smoke — páginas protegidas', () => {
  for (const [path, title] of [
    ['/profile', /mi perfil/i],
    ['/favorites', /favoritos/i],
    ['/history', /historial/i],
  ] as const) {
    test(`${path} muestra el CTA de login sin sesión`, async ({ page }) => {
      await page.goto(path, { waitUntil: 'domcontentloaded' });
      const loginCta = page.getByRole('link', { name: /iniciar sesión/i }).first();
      await expect(loginCta).toBeVisible({ timeout: 20000 });
      await expect(loginCta).toHaveAttribute('href', /\/login/);
    });
  }

  test('/admin redirige al login sin sesión', async ({ page }) => {
    await page.goto('/admin', { waitUntil: 'domcontentloaded' });
    await page.waitForURL(/\/login/, { timeout: 20000 });
    await expect(page.getByRole('heading', { name: /iniciar sesión/i })).toBeVisible();
  });
});

test.describe('Smoke — PWA chrome', () => {
  test('no muestra prompts ni barras de instalar app', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /cine de sala oscura/i })).toBeVisible({
      timeout: 20000,
    });
    await expect(page.getByRole('region', { name: /instalar pelis/i })).toHaveCount(0);
    await expect(page.getByRole('dialog', { name: /nueva versión/i })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /instalar con un toque/i })).toHaveCount(0);
    await expect(page.getByText('Instala Pelis en tu TV Box')).toHaveCount(0);
    await expect(page.getByText(/descargar app/i)).toHaveCount(0);
  });

  test('perfil y footer no muestran CTAs de descarga APK', async ({ page }) => {
    // Páginas del grupo (protected) que no precargan catálogo (sí montan Footer).
    for (const path of ['/profile', '/favorites', '/history'] as const) {
      await page.goto(path, { waitUntil: 'domcontentloaded' });
      await expect(page.getByText(/descargar app/i)).toHaveCount(0);
      await expect(page.getByRole('link', { name: /descargar app android/i })).toHaveCount(0);
    }
  });
});

test.describe('Smoke — formularios de autenticación', () => {
  test('login valida campos vacíos', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: /iniciar sesión/i }).click();
    await expect(page.getByRole('alert').first()).toBeVisible({ timeout: 10000 });
  });

  test('register muestra error cuando las contraseñas no coinciden', async ({ page }) => {
    await page.goto('/register');
    await page.getByLabel(/nombre/i).fill('Test User');
    await page.getByLabel(/email/i).fill('test@example.com');
    await page.getByLabel(/^contraseña/i).fill('password123');
    await page.getByLabel(/confirmar/i).fill('otra-cosa');
    await page.getByRole('button', { name: /crear cuenta/i }).click();
    await expect(page.getByRole('alert').filter({ hasText: /no coinciden/i })).toBeVisible({
      timeout: 10000,
    });
  });
});
