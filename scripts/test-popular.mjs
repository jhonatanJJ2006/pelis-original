import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const page = await ctx.newPage();
await page.goto('https://verpelis.pro/tv', { waitUntil: 'networkidle' });
await page.waitForTimeout(2000);

console.log('Antes del click:');
const before = await page.locator('a[href^="/tv/"]').count();
console.log(`  cards: ${before}`);

const popularBtn = page.locator('button').filter({ hasText: /^Populares$/ }).first();
console.log(`  btn count: ${await popularBtn.count()}`);
console.log(`  btn text: ${await popularBtn.textContent()}`);
await popularBtn.scrollIntoViewIfNeeded();
await popularBtn.click({ force: true });
console.log('Clicked!');

await page.waitForTimeout(500);
const after5 = await page.locator('a[href^="/tv/"]').count();
console.log(`  cards after 500ms: ${after5}`);

await page.waitForTimeout(2000);
const after2s = await page.locator('a[href^="/tv/"]').count();
console.log(`  cards after 2.5s: ${after2s}`);

await page.waitForTimeout(3000);
const after5s = await page.locator('a[href^="/tv/"]').count();
console.log(`  cards after 5.5s: ${after5s}`);

await page.screenshot({ path: '/tmp/after-popular.png', fullPage: true });
await browser.close();
