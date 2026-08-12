import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const page = await ctx.newPage();

// Capturar las queries de Convex
page.on('request', (req) => {
  if (req.url().includes('convex')) {
    const body = req.postData();
    if (body && body.includes('popularOnly')) {
      console.log(`>> ${req.url()}: ${body.slice(0, 200)}`);
    }
  }
});

page.on('response', async (res) => {
  if (res.url().includes('convex')) {
    try {
      const text = await res.text();
      if (text.includes('popularOnly') || text.includes('items')) {
        console.log(`<< ${res.status()} ${res.url().slice(-50)}`);
        const json = JSON.parse(text);
        if (json.value?.items) {
          console.log(`   items: ${json.value.items.length}, total: ${json.value.total}`);
        }
      }
    } catch {}
  }
});

await page.goto('https://verpelis.pro/tv', { waitUntil: 'networkidle' });
await page.waitForTimeout(2000);
const popularBtn = page.locator('button').filter({ hasText: /^Populares$/ }).first();
await popularBtn.click({ force: true });
await page.waitForTimeout(4000);

const visible = await page.locator('a[href^="/tv/"]').count();
console.log(`Visible cards: ${visible}`);

await browser.close();
