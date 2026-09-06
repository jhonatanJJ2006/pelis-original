import { test, expect } from '@playwright/test';
import { canProvisionTestUser, ensureLoggedIn, fetchFirstMovie } from './helpers/session';

/**
 * Flujos autenticados: login, favoritos e historial.
 *
 * Credenciales (cualquiera de los dos):
 *   PELIS_TEST_USER_EMAIL + PELIS_TEST_USER_PASSWORD
 *   E2E_USER_EMAIL + E2E_USER_PASSWORD
 *
 * Si no hay credenciales, el helper crea un usuario vía sign-up y marca
 * emailVerified en Postgres (hace falta DATABASE_URL, ya cargado por playwright.config).
 * No usa Google OAuth.
 */

test.describe('Cuenta — login, favoritos e historial', () => {
  test.beforeEach(() => {
    test.skip(!canProvisionTestUser(), 'Set PELIS_TEST_USER_* / E2E_USER_* or DATABASE_URL');
  });

  test('login con email y contraseña llega al catálogo', async ({ page }) => {
    await ensureLoggedIn(page);
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.locator('header, nav, main').first()).toBeVisible();
  });

  test('favoritos: agregar desde el detalle y quitar en /favorites', async ({ page }) => {
    await ensureLoggedIn(page);
    const movie = await fetchFirstMovie(page);
    test.skip(!movie, 'El catálogo no tiene películas para probar favoritos');

    await page.goto(`/movies/${movie!._id}`);
    await expect(page.getByRole('heading', { name: movie!.name })).toBeVisible({ timeout: 20_000 });

    const addBtn = page.getByRole('button', { name: /agregar a favoritos/i });
    const savedBtn = page.getByRole('button', { name: /en favoritos/i });
    if (await savedBtn.isVisible().catch(() => false)) {
      await savedBtn.click();
      await expect(addBtn).toBeVisible({ timeout: 10_000 });
    }
    await addBtn.click();
    await expect(page.getByRole('button', { name: /en favoritos/i })).toBeVisible({
      timeout: 10_000,
    });

    await page.goto('/favorites');
    await expect(page.getByRole('heading', { name: /favoritos/i })).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByText(movie!.name).first()).toBeVisible({ timeout: 20_000 });

    const favoriteCard = page.getByText(movie!.name).first();
    await favoriteCard.hover();
    await page
      .getByRole('button', { name: /quitar de favoritos/i })
      .first()
      .click();
    await expect(page.getByText(/eliminado de favoritos/i)).toBeVisible({ timeout: 10_000 });
    await page.reload();
    await expect(page.getByRole('heading', { name: /favoritos/i })).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByText(movie!.name)).toHaveCount(0, { timeout: 15_000 });
  });

  test('historial: lista un título sembrado y permite eliminarlo', async ({ page }) => {
    await ensureLoggedIn(page);
    const movie = await fetchFirstMovie(page);
    test.skip(!movie, 'El catálogo no tiene películas para probar historial');

    const upsert = await page.request.post('/api/function/history.upsert', {
      data: { movieId: movie!._id, progress: 120, duration: 600 },
    });
    expect(upsert.ok()).toBeTruthy();

    await page.goto('/history');
    await expect(page.getByRole('heading', { name: /historial/i })).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByText(movie!.name).first()).toBeVisible({ timeout: 20_000 });

    await page
      .getByRole('button', { name: /eliminar del historial/i })
      .first()
      .click();
    await expect(page.getByText(/eliminado del historial/i)).toBeVisible({ timeout: 10_000 });
    await page.reload();
    await expect(page.getByRole('heading', { name: /historial/i })).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByText(movie!.name)).toHaveCount(0, { timeout: 15_000 });
  });
});
