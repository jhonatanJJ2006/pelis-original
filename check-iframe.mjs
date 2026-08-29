import { chromium } from 'playwright';

const target = process.argv[2] || 'https://megavid.buzz/ani/20613/1/sub';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const logs = [];
page.on('console', (m) => logs.push(`[console.${m.type()}] ${m.text().slice(0, 250)}`));
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message.slice(0, 250)}`));
page.on('requestfailed', (r) => logs.push(`[reqfailed] ${r.url().slice(0, 160)} ${r.failure()?.errorText ?? ''}`));

try {
  await page.setContent(`<iframe id="f" src="${target}" style="width:100%;height:100%"></iframe>`);
  await page.waitForTimeout(25000);
  const frame = page.frames().find((f) => f.url().startsWith('http') && f !== page.mainFrame());
  let frameInfo = null;
  if (frame) {
    try {
      frameInfo = await frame.evaluate(() => {
        const v = document.querySelector('video');
        const iframe2 = document.querySelector('iframe');
        return {
          url: location.href,
          videoSrc: v ? (v.currentSrc || v.src || '') : null,
          videoReady: v ? v.readyState : null,
          bodyText: (document.body.innerText || '').slice(0, 300),
          innerIframe: iframe2 ? iframe2.src : null,
          allSrcs: Array.from(document.querySelectorAll('source, video, audio, [src]')).slice(0, 10).map((e) => e.getAttribute('src') || e.currentSrc || '').filter(Boolean),
        };
      });
    } catch (e) {
      frameInfo = { evaluateError: e.message.slice(0, 200), url: frame.url() };
    }
  }
  console.log(JSON.stringify({ target, frames: page.frames().map((f) => f.url().slice(0, 120)), frameInfo, logs: logs.slice(0, 30) }, null, 2));
} catch (e) {
  console.log(JSON.stringify({ target, error: e.message, logs }, null, 2));
}
await browser.close();