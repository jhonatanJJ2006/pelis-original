import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const page = await ctx.newPage();

page.on('console', (msg) => {
  console.log(`[${msg.type()}] ${msg.text().slice(0, 200)}`);
});
page.on('pageerror', (e) => console.log(`[pageerror] ${e.message}`));
page.on('requestfailed', (req) => {
  console.log(`[reqfail] ${req.url().slice(-80)}: ${req.failure()?.errorText}`);
});

await page.goto('https://verpelis.pro/tv', { waitUntil: 'domcontentloaded' });
console.log('=== Cargado ===');
await page.waitForTimeout(3000);
console.log(`Cards iniciales: ${await page.locator('a[href^="/tv/"]').count()}`);

// Verificar el HTML de los cards
const cardHtml = await page.locator('a[href^="/tv/"]').first().innerHTML();
console.log('Card HTML:', cardHtml.slice(0, 300));

console.log('\n=== Click popular ===');
const popularBtn = page.locator('button').filter({ hasText: /^Populares$/ }).first();
await popularBtn.click({ force: true });
await page.waitForTimeout(3000);
console.log(`Cards después: ${await page.locator('a[href^="/tv/"]').count()}`);

// Test query: search en API
console.log('\n=== Test API directa ===');
const apiResult = await page.evaluate(async () => {
  const res = await fetch('https://flexible-lobster-410.convex.cloud/api/query', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path: 'tv:list', args: { popularOnly: true, limit: 50 } }),
  });
  return await res.json();
});
console.log('API result:', JSON.stringify(apiResult).slice(0, 400));

await browser.close();
