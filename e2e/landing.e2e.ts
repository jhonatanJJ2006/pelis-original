import { test, expect } from '@playwright/test';

test.describe('Landing Maison Noir', () => {
  test('visitante ve la landing en /', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(
      page.getByRole('heading', { name: /cine de sala oscura/i }),
    ).toBeVisible({ timeout: 20000 });
    await expect(page.getByRole('link', { name: /crear cuenta/i }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: /explorar catálogo/i }).first()).toBeVisible();
  });
});
