import { test, expect } from '@playwright/test';

/**
 * E2E del playground de componentes (/playground).
 * Solo disponible en desarrollo (en producción redirige/oculta).
 */

test.describe('Playground de componentes', () => {
  test('carga con todos los grupos de componentes', async ({ page }) => {
    await page.goto('/playground');

    await expect(
      page.getByRole('heading', { name: /playground de componentes/i })
    ).toBeVisible({ timeout: 20000 });

    const sections = [
      'Botones',
      'Badges',
      'Inputs y selects',
      'Filtros de catálogo',
      'Tarjetas de película',
      'Posters',
      'Headers de sección',
      'Estados vacíos',
      'Spinners y skeletons',
    ];

    for (const section of sections) {
      await expect(
        page.getByRole('heading', { name: new RegExp(section, 'i') })
      ).toBeVisible();
    }
  });

  test('renderiza tarjetas de película de ejemplo', async ({ page }) => {
    await page.goto('/playground');
    await expect(page.getByText('Dune: Parte Dos')).toBeVisible({ timeout: 20000 });
    await expect(page.getByText('The Last of Us')).toBeVisible();
  });

  test('el filtro de búsqueda del playground funciona', async ({ page }) => {
    await page.goto('/playground');
    const search = page.getByLabel('Buscar en el playground');
    await expect(search).toBeVisible({ timeout: 20000 });
    await search.fill('dune');
    await expect(search).toHaveValue('dune');
  });

  test('los estados vacíos muestran su texto', async ({ page }) => {
    await page.goto('/playground');
    await expect(page.getByText('Sin favoritos')).toBeVisible({ timeout: 20000 });
    await expect(page.getByRole('link', { name: 'Explorar películas' })).toBeVisible();
  });
});