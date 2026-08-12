import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const page = await ctx.newPage();

// Capturar TODAS las requests a convex
let requestCount = 0;
page.on('requestfinished', async (req) => {
  if (req.url().includes('convex')) {
    requestCount++;
    try {
      const body = req.postData() ?? '';
      const resp = await req.response();
      const respBody = resp ? await resp.text() : '';
      console.log(`[${requestCount}] POST convex`);
      console.log(`  Body: ${body.slice(0, 250)}`);
      try {
        const json = JSON.parse(respBody);
        if (json.value?.items !== undefined) {
          console.log(`  Response: total=${json.value.total}, items=${json.value.items.length}`);
        } else if (json.status === 'error') {
          console.log(`  ERROR: ${json.errorMessage}`);
        } else {
          console.log(`  Response: ${respBody.slice(0, 100)}`);
        }
      } catch {
        console.log(`  Response: ${respBody.slice(0, 100)}`);
      }
    } catch (e) {
      console.log(`  Error: ${e.message}`);
    }
  }
});

await page.goto('https://verpelis.pro/tv', { waitUntil: 'domcontentloaded' });
console.log('--- Cargada, esperando ---');
await page.waitForTimeout(3000);
console.log(`Requests después de cargar: ${requestCount}`);

const popularBtn = page.locator('button').filter({ hasText: /^Populares$/ }).first();
console.log(`Botón count: ${await popularBtn.count()}`);
await popularBtn.click({ force: true });
console.log('--- Click ---');
await page.waitForTimeout(5000);
console.log(`Requests después de click: ${requestCount}`);
console.log(`Cards visibles: ${await page.locator('a[href^="/tv/"]').count()}`);

await browser.close();
