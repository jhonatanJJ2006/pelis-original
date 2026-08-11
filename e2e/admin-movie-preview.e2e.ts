/**
 * Admin movie preview playback diagnostic (production or local).
 *
 * Env vars (add to .env at repo root):
 *   PLAYWRIGHT_BASE_URL=https://verpelis.pro
 *   E2E_ADMIN_EMAIL=admin@example.com
 *   E2E_ADMIN_PASSWORD=yourpassword
 *
 * Run:
 *   pnpm exec playwright test --config=e2e/playwright.config.ts --project=admin-preview
 */
import { test, expect } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const MAX_ROWS = 5;
const SUCCESS_THRESHOLD_SEC = 12;
const STUCK_THRESHOLD_SEC = 10.5;

interface MovieReport {
  index: number;
  name: string;
  token: string;
  videoUrl: string | null;
  status: 'no_video' | 'playback_ok' | 'stuck_at_10s' | 'load_error' | 'modal_error';
  currentTime: number;
  networkErrors: string[];
  consoleErrors: string[];
  verdict: string;
}

function adminCredentials() {
  const email =
    process.env.E2E_ADMIN_EMAIL ??
    process.env.ADMIN_EMAILS?.split(',')[0]?.trim() ??
    '';
  const password = process.env.E2E_ADMIN_PASSWORD ?? '';
  return { email, password };
}

function writeReport(reports: MovieReport[]) {
  const outDir = join(process.cwd(), 'test-results');
  mkdirSync(outDir, { recursive: true });
  const reportPath = join(outDir, 'admin-preview-report.json');
  const summary = {
    testedAt: new Date().toISOString(),
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000',
    total: reports.length,
    noVideo: reports.filter((r) => r.status === 'no_video').length,
    playbackOk: reports.filter((r) => r.status === 'playback_ok').length,
    stuckAt10s: reports.filter((r) => r.status === 'stuck_at_10s').length,
    loadError: reports.filter((r) => r.status === 'load_error').length,
    modalError: reports.filter((r) => r.status === 'modal_error').length,
    movies: reports,
  };
  writeFileSync(reportPath, JSON.stringify(summary, null, 2));
  console.log(`Report written to ${reportPath}`);
  console.log(JSON.stringify(summary, null, 2));
  return summary;
}

async function loginAsAdmin(page: import('@playwright/test').Page) {
  const { email, password } = adminCredentials();
  if (!email || !password) {
    test.skip(true, 'Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD in .env');
  }

  await page.goto('/login');
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel('Contraseña', { exact: true }).fill(password);
  await page.getByRole('button', { name: /iniciar sesión/i }).click();

  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15000 });
}

async function waitForPlaybackResult(
  page: import('@playwright/test').Page,
  video: import('@playwright/test').Locator
): Promise<{ currentTime: number; loadErrorText: string | null }> {
  const deadline = Date.now() + 20000;
  let lastTime = -1;
  let stagnantChecks = 0;

  while (Date.now() < deadline) {
    const loadError = page.getByTestId('admin-preview-video-error');
    if (await loadError.isVisible().catch(() => false)) {
      return { currentTime: 0, loadErrorText: await loadError.textContent() };
    }

    const currentTime = await video.evaluate((el: HTMLVideoElement) => el.currentTime).catch(() => 0);

    if (currentTime > SUCCESS_THRESHOLD_SEC) {
      return { currentTime, loadErrorText: null };
    }

    if (currentTime > 0 && currentTime <= STUCK_THRESHOLD_SEC && Math.abs(currentTime - lastTime) < 0.1) {
      stagnantChecks += 1;
      if (stagnantChecks >= 3) {
        return { currentTime, loadErrorText: null };
      }
    } else {
      stagnantChecks = 0;
    }

    lastTime = currentTime;
    await page.waitForTimeout(2000);
  }

  const currentTime = await video.evaluate((el: HTMLVideoElement) => el.currentTime).catch(() => 0);
  return { currentTime, loadErrorText: null };
}

test.describe('Admin movie preview playback', () => {
  test('orphan_ids rows: modal opens and video advances past 12s', async ({ page }) => {
    test.setTimeout(300000);

    const reports: MovieReport[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        console.log('[console.error]', msg.text());
      }
    });

    await loginAsAdmin(page);
    await page.goto('/admin/movies?filter=orphan_ids');

    await expect(page.getByRole('heading', { name: /películas/i })).toBeVisible({ timeout: 20000 });

    const rows = page.locator('tbody tr');
    await expect(rows.first()).toBeVisible({ timeout: 30000 });

    const rowCount = Math.min(await rows.count(), MAX_ROWS);

    try {
      for (let i = 0; i < rowCount; i++) {
        const rowConsoleErrors: string[] = [];
        const networkErrors: string[] = [];
        let mediaUrl: string | null = null;

        const onResponse = (response: import('@playwright/test').Response) => {
          const url = response.url();
          const isMedia =
            /\.m3u8(\?|$)/i.test(url) ||
            /\.ts(\?|$)/i.test(url) ||
            /\.mp4(\?|$)/i.test(url);
          if (isMedia && response.status() >= 400) {
            networkErrors.push(`${response.status()} ${url}`);
          }
          if (isMedia && !mediaUrl && response.status() < 400) {
            mediaUrl = url;
          }
        };

        const onConsole = (msg: import('@playwright/test').ConsoleMessage) => {
          if (msg.type() === 'error') rowConsoleErrors.push(msg.text());
        };

        page.on('response', onResponse);
        page.on('console', onConsole);

        const row = rows.nth(i);
        const name = (await row.locator('td').nth(1).locator('p').first().textContent()) ?? `row-${i}`;
        const token = (await row.locator('td').nth(2).textContent()) ?? '';

        try {
          await row.click();
          await expect(page.getByRole('dialog')).toBeVisible({ timeout: 10000 });

          await expect(
            page.getByTestId('admin-preview-no-video').or(page.getByTestId('admin-preview-video'))
          ).toBeVisible({ timeout: 15000 });

          const noVideo = page.getByTestId('admin-preview-no-video');
          if (await noVideo.isVisible().catch(() => false)) {
            reports.push({
              index: i,
              name: name.trim(),
              token: token.trim(),
              videoUrl: null,
              status: 'no_video',
              currentTime: 0,
              networkErrors: [...networkErrors],
              consoleErrors: [...rowConsoleErrors],
              verdict: 'No stream file on server (MOVIE_OUTPUT_ROOT)',
            });
            continue;
          }

          const legacyNoVideo = page.getByText(/sin video disponible/i);
          if (await legacyNoVideo.isVisible().catch(() => false)) {
            reports.push({
              index: i,
              name: name.trim(),
              token: token.trim(),
              videoUrl: null,
              status: 'no_video',
              currentTime: 0,
              networkErrors: [...networkErrors],
              consoleErrors: [...rowConsoleErrors],
              verdict: 'No videoUrl and no stream fallback',
            });
            continue;
          }

          const videoContainer = page.getByTestId('admin-preview-video');
          await expect(videoContainer).toBeVisible({ timeout: 10000 });

          const videoUrlAttr = await videoContainer.getAttribute('data-video-url');
          const video = videoContainer.locator('video');
          await video.waitFor({ state: 'attached', timeout: 5000 });

          await video.evaluate((el: HTMLVideoElement) => {
            el.muted = true;
            return el.play();
          }).catch(() => {});

          const { currentTime, loadErrorText } = await waitForPlaybackResult(page, video);

          let status: MovieReport['status'];
          let verdict: string;

          if (loadErrorText) {
            status = 'load_error';
            verdict = loadErrorText.trim();
          } else if (currentTime > SUCCESS_THRESHOLD_SEC) {
            status = 'playback_ok';
            verdict = `Playback OK (${currentTime.toFixed(1)}s)`;
          } else if (currentTime > 0 && currentTime <= STUCK_THRESHOLD_SEC) {
            status = 'stuck_at_10s';
            verdict = `Stuck ~10s (currentTime=${currentTime.toFixed(1)}s) — likely HLS segment 2 failure`;
          } else {
            status = 'load_error';
            verdict = `No progress (currentTime=${currentTime.toFixed(1)}s)`;
          }

          reports.push({
            index: i,
            name: name.trim(),
            token: token.trim(),
            videoUrl: videoUrlAttr ?? mediaUrl,
            status,
            currentTime,
            networkErrors: [...networkErrors],
            consoleErrors: [...rowConsoleErrors],
            verdict,
          });
        } catch (err) {
          reports.push({
            index: i,
            name: name.trim(),
            token: token.trim(),
            videoUrl: mediaUrl,
            status: 'modal_error',
            currentTime: 0,
            networkErrors: [...networkErrors],
            consoleErrors: [...rowConsoleErrors, String(err)],
            verdict: String(err),
          });
        } finally {
          page.off('response', onResponse);
          page.off('console', onConsole);
          if (await page.getByRole('dialog').isVisible().catch(() => false)) {
            await page.keyboard.press('Escape');
            await page.waitForTimeout(300);
          }
        }
      }
    } finally {
      writeReport(reports);
    }

    const withVideo = reports.filter((r) => r.status !== 'no_video' && r.status !== 'modal_error');
    if (withVideo.length === 0) {
      test.info().annotations.push({
        type: 'note',
        description: 'No movies with video player in sample',
      });
      return;
    }

    const failed = withVideo.filter((r) => r.status !== 'playback_ok');
    const failRate = failed.length / withVideo.length;

    if (failRate > 0.5) {
      const lines = failed.map((r) => `  • ${r.name}: ${r.verdict}`).join('\n');
      expect.soft(failRate, `>50% playback failures:\n${lines}`).toBeLessThanOrEqual(0.5);
    }
  });
});
