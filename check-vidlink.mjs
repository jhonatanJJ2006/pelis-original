import { chromium } from 'playwright';

const url = process.argv[2] || 'https://vidlink.pro/anime/20613/1/sub';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const logs = [];
page.on('console', (m) => logs.push(`[console.${m.type()}] ${m.text().slice(0, 300)}`));
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message.slice(0, 300)}`));
page.on('requestfailed', (r) => logs.push(`[reqfailed] ${r.method()} ${r.url().slice(0, 200)} ${r.failure()?.errorText ?? ''}`));

try {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(20000);
  const video = await page.$('video');
  const videoSrc = video ? await video.evaluate((v) => ({ src: v.currentSrc || v.src || '', ready: v.readyState, paused: v.paused })) : null;
  const bodyText = (await page.evaluate(() => document.body.innerText)).slice(0, 500);
  const netRequests = logs.filter((l) => l.includes('[reqfailed]') || l.includes('m3u8') || l.includes('justchill')).slice(0, 15);
  console.log(JSON.stringify({ url, videoSrc, bodyText, logs: logs.slice(0, 25), netRequests }, null, 2));
} catch (e) {
  console.log(JSON.stringify({ url, error: e.message, logs }, null, 2));
}
await browser.close();
