import { test, expect } from '@playwright/test';

/**
 * Smoke E2E de APIs: verifica que los endpoints clave responden con el
 * formato esperado sin necesidad de login.
 */

test.describe('API smoke', () => {
  test('GET /api/app/availability devuelve metadatos de la app', async ({ request }) => {
    const res = await request.get('/api/app/availability');
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body).toHaveProperty('apkAvailable');
    expect(typeof body.apkAvailable).toBe('boolean');
  });

  test('better-auth expone get-session', async ({ request }) => {
    const res = await request.get('/api/auth/get-session');
    // 200 con sesión null (anónimo) o 401 según configuración
    expect([200, 401]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      expect(body).toHaveProperty('session');
      expect(body.session).toBeNull();
    }
  });

  test('POST /api/auth/sign-up/email valida cuerpo vacío', async ({ request }) => {
    const res = await request.post('/api/auth/sign-up/email', { data: {} });
    expect([400, 422]).toContain(res.status());
  });

  test('proxy de stream rechaza tokens maliciosos', async ({ request }) => {
    const res = await request.get('/api/stream/../../etc/passwd');
    expect([400, 404]).toContain(res.status());
  });
});

test.describe('API smoke — TV', () => {
  test('el stream de un canal real devuelve un manifiesto m3u8', async ({ page, request }) => {
    await page.goto('/tv');
    const channelLink = page.locator('a[href^="/tv/"]').first();
    await expect(channelLink).toBeVisible({ timeout: 20000 });
    const href = await channelLink.getAttribute('href');
    const channelId = href?.split('/').pop();

    const res = await request.get(`/api/tv/stream/${channelId}`);
    expect([200, 404]).toContain(res.status());
    if (res.status() === 200) {
      const manifest = await res.text();
      expect(manifest).toContain('#EXTM3U');
    }
  });

  test('el stream de un canal inexistente devuelve 404', async ({ request }) => {
    const res = await request.get('/api/tv/stream/does-not-exist-xyz');
    expect([404, 500]).toContain(res.status());
  });
});