import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const page = await ctx.newPage();
await page.goto('https://verpelis.pro/tv', { waitUntil: 'networkidle' });
await page.waitForTimeout(2000);

// Buscar todos los botones
const buttons = await page.locator('button').evaluateAll((els) =>
  els.map((el) => ({
    text: el.textContent?.trim().slice(0, 40),
    visible: el.offsetParent !== null,
  }))
);
console.log('Botones encontrados:', buttons.length);
buttons.forEach((b, i) => {
  if (b.text?.toLowerCase().includes('popular') || b.text?.toLowerCase().includes('disney')) {
    console.log(`  [${i}] "${b.text}" visible=${b.visible}`);
  }
});

await page.screenshot({ path: '/tmp/popular-debug.png', fullPage: true });
await browser.close();
