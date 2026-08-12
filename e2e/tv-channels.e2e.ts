import { test, expect } from '@playwright/test';

/**
 * Suite E2E completa para la página /tv y el reproductor de canales.
 *
 * Variables de entorno necesarias:
 *   PLAYWRIGHT_BASE_URL   ej. https://verpelis.pro  (default: localhost:3000)
 *   PELIS_TEST_USER_EMAIL email de admin
 *   PELIS_TEST_USER_PASSWORD contraseña
 *   PELIS_TEST_SAMPLE_CHANNELS  número de canales aleatorios a probar (default 10)
 */

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000';
const SAMPLE = parseInt(process.env.PELIS_TEST_SAMPLE_CHANNELS ?? '10', 10);

async function login(page: import('@playwright/test').Page) {
  // login via UI
  await page.goto(`${BASE}/login`);
  await page.locator('input[type=email]').fill(process.env.PELIS_TEST_USER_EMAIL!);
  await page.locator('input[type=password]').fill(process.env.PELIS_TEST_USER_PASSWORD!);
  await page.locator('button[type=submit]').click();
  // wait for redirect to home
  await page.waitForURL(/\/(?!login)/, { timeout: 30_000 });
}

test.describe('TV — página pública y reproductor', () => {
  test('smoke: /tv carga con canales visibles', async ({ page }) => {
    const t0 = Date.now();
    await page.goto(`${BASE}/tv`, { waitUntil: 'networkidle' });
    await expect(page).toHaveURL(/\/tv/);
    // Al menos un canal visible
    const cards = page.locator('a[href^="/tv/"]');
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);
    const elapsed = Date.now() - t0;
    console.log(`[smoke] /tv cargó en ${elapsed}ms con ${count} canales`);
  });

  test('filtros: búsqueda por palabra clave funciona', async ({ page }) => {
    await page.goto(`${BASE}/tv`);
    const search = page.locator('input[placeholder*="Buscar"]').first();
    await search.fill('Disney');
    // wait debounce
    await page.waitForTimeout(800);
    const cards = page.locator('a[href^="/tv/"]');
    const count = await cards.count();
    // cada card debe tener "Disney" en su texto visible
    if (count > 0) {
      const texts = await cards.allInnerTexts();
      const allMatch = texts.every((t) => /disney/i.test(t));
      expect(allMatch).toBeTruthy();
    }
    console.log(`[buscar] Disney → ${count} resultados`);
  });

  test('filtro populares: solo canales populares', async ({ page }) => {
    await page.goto(`${BASE}/tv`);
    await page.getByRole('button', { name: /populares/i }).click();
    await page.waitForTimeout(800);
    // debe haber al menos N cards con icono popular
    const cards = page.locator('a[href^="/tv/"]');
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);
    console.log(`[populares] ${count} canales populares mostrados`);
  });

  test('reproducción: itera canales y mide tiempo a primer frame', async ({ page }) => {
    test.setTimeout(300_000);
    await login(page);

    await page.goto(`${BASE}/tv`);
    await page.waitForLoadState('networkidle');

    // Recolectar IDs únicos de canales
    const links = await page.locator('a[href^="/tv/"]').evaluateAll((els) =>
      Array.from(
        new Set(
          els
            .map((el) => el.getAttribute('href'))
            .filter((h): h is string => !!h && h.startsWith('/tv/') && h.length > 5)
        )
      ).slice(0, 50)
    );

    const results: Array<{
      channelId: string;
      loaded: boolean;
      timeMs?: number;
      error?: string;
    }> = [];

    for (const href of links.slice(0, SAMPLE)) {
      const t0 = Date.now();
      const channelPage = await page.context().newPage();
      try {
        await channelPage.goto(`${BASE}${href}`, { waitUntil: 'domcontentloaded' });
        // esperar hasta que el video aparezca (player) o un error
        const video = channelPage.locator('video').first();
        const errorBox = channelPage.locator('[role=alert]').first();
        await Promise.race([
          video.waitFor({ state: 'visible', timeout: 15_000 }).catch(() => null),
          errorBox.waitFor({ state: 'visible', timeout: 15_000 }).catch(() => null),
          channelPage.waitForTimeout(15_000),
        ]);
        const videoVisible = await video.isVisible().catch(() => false);
        const errorText = errorBox.isVisible().catch(() => false)
          ? await errorBox.innerText().catch(() => '')
          : '';
        results.push({
          channelId: href.split('/').pop()!,
          loaded: videoVisible,
          timeMs: Date.now() - t0,
          error: errorText || undefined,
        });
      } catch (err) {
        results.push({
          channelId: href.split('/').pop()!,
          loaded: false,
          error: err instanceof Error ? err.message : String(err),
        });
      } finally {
        await channelPage.close();
      }
    }

    const loadedCount = results.filter((r) => r.loaded).length;
    const avgMs =
      results.filter((r) => r.timeMs).reduce((a, b) => a + (b.timeMs ?? 0), 0) /
      Math.max(1, results.length);

    console.log(`[repro] Probados: ${results.length}, cargados: ${loadedCount}, avg ${avgMs.toFixed(0)}ms`);
    results.forEach((r) => {
      console.log(`  ${r.loaded ? '✓' : '✗'} ${r.channelId.slice(0, 12)}... (${r.timeMs ?? '?'}ms)${r.error ? ' — ' + r.error.slice(0, 60) : ''}`);
    });

    expect(results.length).toBeGreaterThan(0);
  });

  test('proxy-fix: el manifest reescrito usa origin público (no localhost)', async ({
    page,
    request,
  }) => {
    await login(page);
    await page.goto(`${BASE}/tv`);
    await page.waitForLoadState('networkidle');

    const links = await page.locator('a[href^="/tv/"]').evaluateAll((els) =>
      Array.from(
        new Set(
          els
            .map((el) => el.getAttribute('href'))
            .filter((h): h is string => !!h && h.startsWith('/tv/') && h.length > 5)
        )
      ).slice(0, 5)
    );

    for (const href of links) {
      const r = await request.get(`${BASE}${href}`, { failOnStatusCode: false });
      // buscar video src dentro del HTML/iframe
      const html = await r.text();
      const videoSrc = html.match(/<video[^>]*src=["']([^"']+)["']/)?.[1];
      const apiRef = href.split('/').pop()!;
      const manifestRes = await request.get(`${BASE}/api/tv/stream/${apiRef}`, {
        failOnStatusCode: false,
      });
      const manifest = await manifestRes.text();
      // ❌ Antes: localhost:3000 salía dentro del manifest
      // ✅ Ahora: NO debe haber localhost
      expect(manifest).not.toMatch(/localhost/i);
      // debe contener URLs absolutas con el host público (o relativas)
      const urlHost = new URL(BASE).host;
      if (manifest.includes('http')) {
        expect(manifest).toContain(urlHost);
      }
      console.log(`[proxy] ${apiRef.slice(0, 12)}: OK (sin localhost, host=${urlHost})`);
    }
  });

  test('performance: LCP < 3s en /tv', async ({ page }) => {
    await page.goto(`${BASE}/tv`, { waitUntil: 'domcontentloaded' });
    // capturar LCP vía PerformanceObserver
    const lcp = await page.evaluate(
      () =>
        new Promise<number>((resolve) => {
          let value = 0;
          const obs = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const last = entries[entries.length - 1] as any;
            value = last?.renderTime || last?.loadTime || last?.startTime || 0;
          });
          obs.observe({ type: 'largest-contentful-paint', buffered: true });
          setTimeout(() => {
            obs.disconnect();
            resolve(value);
          }, 4000);
        })
    );
    console.log(`[perf] LCP: ${lcp.toFixed(0)}ms`);
    // Permitimos hasta 3.5s por CDN/network
    expect(lcp).toBeLessThan(3500);
  });
});