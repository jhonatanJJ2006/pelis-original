import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const page = await ctx.newPage();

// Capturar TODAS las requests
page.on('request', (req) => {
  if (req.url().includes('convex')) {
    console.log(`>> ${req.method()} ${req.url().slice(-80)}: ${(req.postData() ?? '').slice(0, 150)}`);
  }
});
page.on('response', (res) => {
  if (res.url().includes('convex')) {
    console.log(`<< ${res.status()} ${res.url().slice(-80)}`);
  }
});
page.on('console', (msg) => {
  console.log(`[console ${msg.type()}] ${msg.text().slice(0, 200)}`);
});
page.on('pageerror', (e) => console.log(`[pageerror] ${e.message}`));

await page.goto('https://verpelis.pro/tv', { waitUntil: 'load' });
console.log('=== Página cargada ===');
await page.waitForTimeout(2000);
console.log(`Cards: ${await page.locator('a[href^="/tv/"]').count()}`);

console.log('\n=== Click popular ===');
const popularBtn = page.locator('button').filter({ hasText: /^Populares$/ }).first();
await popularBtn.click({ force: true });
await page.waitForTimeout(5000);
console.log(`Cards after click: ${await page.locator('a[href^="/tv/"]').count()}`);

await browser.close();
