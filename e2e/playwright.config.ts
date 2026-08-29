import { defineConfig } from '@playwright/test';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

function loadEnvFile() {
  const envPath = join(__dirname, '..', '.env');
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvFile();

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000';
const isRemote = !baseURL.includes('localhost') && !baseURL.includes('127.0.0.1');
const localPort = new URL(baseURL).port || '3000';

export default defineConfig({
  testDir: '.',
  testMatch: '**/*.e2e.ts',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'html',
  timeout: 120000,
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'default',
      testMatch: '**/*.e2e.ts',
      testIgnore: '**/admin-movie-preview.e2e.ts',
      timeout: 60000,
    },
    {
      name: 'admin-preview',
      testMatch: '**/admin-movie-preview.e2e.ts',
      timeout: 180000,
    },
  ],
  ...(isRemote
    ? {}
    : {
        webServer: {
          command: `PORT=${localPort} node scripts/find-port.js`,
          cwd: join(__dirname, '..', 'apps', 'web'),
          url: baseURL,
          reuseExistingServer: !process.env.CI,
          timeout: 120000,
        },
      }),
});
