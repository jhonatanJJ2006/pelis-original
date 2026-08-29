import { chromium } from 'playwright';

const url = process.argv[2] || 'https://www4.animeflv.net/ver/akame-ga-kill-1';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const reqs = [];
page.on('request', (r) => {
  if (!['image', 'stylesheet', 'font'].includes(r.resourceType())) reqs.push(r.method() + ' ' + r.url());
});
page.on('console', (m) => reqs.push(`[console.${m.type()}] ${m.text().slice(0, 200)}`));
try {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(15000);
  const state = await page.evaluate(() => {
    const v = window.videos;
    const box = document.getElementById('video_box');
    return {
      videos: typeof v === 'object' && v ? Object.keys(v).map((lang) => ({ lang, opts: Object.keys(v[lang] || {}).length })) : String(v),
      videoBoxHtml: box ? box.innerHTML.slice(0, 400) : null,
      iframes: Array.from(document.querySelectorAll('iframe')).map((f) => f.src).slice(0, 5),
    };
  });
  const uniq = [...new Set(reqs)].slice(0, 40);
  console.log(JSON.stringify({ url, state, requests: uniq }, null, 2));
} catch (e) {
  console.log(JSON.stringify({ url, error: e.message, requests: [...new Set(reqs)] }, null, 2));
}
await browser.close();