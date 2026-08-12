import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const page = await ctx.newPage();

page.on('requestfinished', async (req) => {
  if (req.url().includes('convex')) {
    try {
      const body = req.postData();
      if (body && (body.includes('popular') || body.includes('tv:list'))) {
        console.log('REQ:', body.slice(0, 200));
      }
    } catch {}
  }
});

page.on('response', async (res) => {
  if (res.url().includes('convex')) {
    try {
      const text = await res.text();
      if (text.includes('popularOnly') || (text.includes('items') && text.includes('total'))) {
        const json = JSON.parse(text);
        if (json.value?.items !== undefined) {
          console.log(`RES: total=${json.value.total}, items=${json.value.items.length}`);
        }
      }
    } catch {}
  }
});

await page.goto('https://verpelis.pro/tv', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(3000);
console.log('--- Click popular ---');
const popularBtn = page.locator('button').filter({ hasText: /^Populares$/ }).first();
await popularBtn.click({ force: true });
await page.waitForTimeout(5000);
const visible = await page.locator('a[href^="/tv/"]').count();
console.log(`After click cards: ${visible}`);
const bodyText = await page.locator('main, body').first().innerText();
console.log('Page text snippet:', bodyText.slice(0, 300));

await browser.close();
