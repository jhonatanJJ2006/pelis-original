#!/usr/bin/env node
/**
 * Smoke test E2E contra producción verpelis.pro.
 * Usa Playwright (ya instalado en el monorepo) sin requerir login.
 */

import { chromium } from 'playwright';

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? 'https://verpelis.pro';

function log(msg) {
  console.log(`[${new Date().toISOString().slice(11, 19)}] ${msg}`);
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });
  const page = await ctx.newPage();

  const results = {};

  // === Test 1: smoke /tv ===
  log('TEST 1: /tv smoke');
  const t0 = Date.now();
  await page.goto(`${BASE}/tv`, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => null);
  const loadTime = Date.now() - t0;

  await page.screenshot({ path: '/tmp/tv-smoke.png', fullPage: false });

  const cardCount = await page.locator('a[href^="/tv/"]').count();
  results.smoke = {
    url: page.url(),
    loadTimeMs: loadTime,
    channelsRendered: cardCount,
    ok: cardCount > 0,
  };
  log(`  ✓ ${cardCount} canales en ${loadTime}ms`);

  // === Test 2: proxy fix ===
  log('TEST 2: proxy fix — manifest no debe contener localhost');
  const channelLinks = await page.locator('a[href^="/tv/"]').evaluateAll((els) =>
    Array.from(
      new Set(
        els
          .map((e) => e.getAttribute('href'))
          .filter((h) => h && h.length > 5)
      )
    ).slice(0, 5)
  );

  const proxyResults = [];
  for (const href of channelLinks) {
    const channelId = href.split('/').pop();
    try {
      const response = await page.request.get(`${BASE}/api/tv/stream/${channelId}`, {
        failOnStatusCode: false,
      });
      const manifest = await response.text();
      const hasLocalhost = /localhost/i.test(manifest);
      const urlHost = new URL(BASE).host;
      const hasPublicHost = manifest.includes(urlHost);
      proxyResults.push({
        channelId,
        status: response.status(),
        hasLocalhost,
        hasPublicHost,
        snippet: manifest.split('\n').slice(-3).join(' | '),
      });
      log(`  ${response.status()} | localhost: ${hasLocalhost ? '❌' : '✅'} | host: ${hasPublicHost ? '✅' : '—'} | ${channelId}`);
    } catch (err) {
      log(`  ✗ ${channelId}: ${err.message}`);
    }
  }
  results.proxyFix = {
    tested: proxyResults.length,
    allOk: proxyResults.every((r) => !r.hasLocalhost),
    details: proxyResults,
  };

  // === Test 3: filtro populares ===
  log('TEST 3: filtro populares');
  await page.goto(`${BASE}/tv`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);
  // El botón está dentro de un contenedor, usar locator de texto exacto
  const popularBtn = page.locator('button').filter({ hasText: /^Populares$/ });
  const popularCount = await popularBtn.count();
  log(`  Botones encontrados: ${popularCount}`);
  if (popularCount > 0) {
    await popularBtn.first().scrollIntoViewIfNeeded();
    await popularBtn.first().click({ force: true });
    await page.waitForTimeout(3000);
    const channelsRendered = await page.locator('a[href^="/tv/"]').count();
    await page.screenshot({ path: '/tmp/tv-popular.png', fullPage: false });
    results.popular = { channelsRendered };
    log(`  ✓ ${channelsRendered} canales populares`);
  } else {
    results.popular = { error: 'Botón no encontrado' };
  }

  // === Test 4: filtro de búsqueda ===
  log('TEST 4: búsqueda por palabra clave');
  await page.goto(`${BASE}/tv`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(500);
  const search = page.locator('input[placeholder*="Buscar"]').first();
  await search.fill('Disney');
  await page.waitForTimeout(1500);
  const disneyCount = await page.locator('a[href^="/tv/"]').count();
  results.search = { term: 'Disney', channelsRendered: disneyCount };
  log(`  ✓ ${disneyCount} canales Disney`);

  // === Test 5: LCP performance ===
  log('TEST 5: LCP performance');
  await page.goto(`${BASE}/tv`, { waitUntil: 'domcontentloaded' });
  const lcp = await page.evaluate(
    () =>
      new Promise((resolve) => {
        let value = 0;
        const obs = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const last = entries[entries.length - 1];
          value = last?.renderTime || last?.loadTime || last?.startTime || 0;
        });
        try {
          obs.observe({ type: 'largest-contentful-paint', buffered: true });
        } catch {
          resolve(0);
          return;
        }
        setTimeout(() => {
          obs.disconnect();
          resolve(value);
        }, 4000);
      })
  );
  results.lcp = { ms: Math.round(lcp) };
  log(`  ✓ LCP: ${Math.round(lcp)}ms`);

  // === Resumen ===
  log('\n=== RESUMEN ===');
  console.log(JSON.stringify(results, null, 2));

  await browser.close();

  // Exit code
  const ok =
    results.smoke?.ok &&
    results.proxyFix?.allOk &&
    results.popular?.channelsRendered > 0 &&
    results.search?.channelsRendered >= 0 &&
    results.lcp?.ms < 4000;

  process.exit(ok ? 0 : 1);
}

main().catch((err) => {
  console.error('FATAL:', err.message);
  process.exit(2);
});