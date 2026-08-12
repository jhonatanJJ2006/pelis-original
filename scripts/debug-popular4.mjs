import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const page = await ctx.newPage();

// Capturar TODAS las requests
page.on('request', (req) => {
  if (req.url().includes('convex')) {
    console.log(`>> ${req.method()} ${req.url().slice(-80)}: ${(req.postData() ?? '').slice(0, 100)}`);
  }
});
page.on('response', (res) => {
  if (res.url().includes('convex')) {
    console.log(`<< ${res.status()} ${res.url().slice(-80)}`);
  }
});
page.on('console', (msg) => {
  if (msg.type() === 'error' || msg.text().includes('convex')) {
    console.log(`[console ${msg.type()}] ${msg.text().slice(0, 200)}`);
  }
});
page.on('pageerror', (e) => console.log(`[pageerror] ${e.message}`));

await page.goto('https://verpelis.pro/tv', { waitUntil: 'networkidle' });
console.log('=== Página cargada ===');
await page.waitForTimeout(3000);

console.log('\n=== Click popular ===');
const popularBtn = page.locator('button').filter({ hasText: /^Populares$/ }).first();
await popularBtn.click({ force: true });
await page.waitForTimeout(5000);

const cards = await page.locator('a[href^="/tv/"]').count();
console.log(`\nFinal: ${cards} cards`);

// Inspeccionar el estado de React si es posible
const state = await page.evaluate(() => {
  return {
    title: document.title,
    bodyText: document.body.innerText.slice(0, 200),
    scripts: Array.from(document.scripts).filter(s => s.src.includes('convex')).map(s => s.src.slice(-50)),
  };
});
console.log('State:', JSON.stringify(state, null, 2));

await browser.close();
