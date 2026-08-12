import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const page = await ctx.newPage();

page.on('request', (req) => {
  console.log(`${req.method()} ${req.url().slice(0, 150)}`);
});
page.on('response', (res) => {
  console.log(`← ${res.status()} ${res.url().slice(0, 150)}`);
});

await page.goto('https://verpelis.pro/tv', { waitUntil: 'load' });
console.log('=== Cargado ===');
await page.waitForTimeout(3000);
await browser.close();
