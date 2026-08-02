import { test, expect } from '@playwright/test';
import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const CONVEX_DIR = resolve(__dirname, '../packages/convex');
const ROOT_ENV = resolve(__dirname, '../.env');

function getOtpFromConvex(email: string): string {
  const out = execSync('npx convex data users --format json', {
    cwd: CONVEX_DIR,
    encoding: 'utf-8',
    timeout: 30000,
  });
  const rows = JSON.parse(out) as Array<{ email?: string; otp?: string }>;
  const row = rows.find((r) => r.email?.toLowerCase() === email.toLowerCase());
  if (!row?.otp) {
    throw new Error(`OTP not found for ${email}\n${out}`);
  }
  return row.otp;
}

function getResendApiKey(): string | null {
  try {
    const env = readFileSync(ROOT_ENV, 'utf-8');
    const match = env.match(/^RESEND_API_KEY=(.+)$/m);
    return match ? match[1].trim() : null;
  } catch {
    return null;
  }
}

async function assertEmailSentToResend(email: string) {
  const apiKey = getResendApiKey();
  if (!apiKey) {
    test.skip(true, 'RESEND_API_KEY no disponible en .env');
    return;
  }
  const res = await fetch(`https://api.resend.com/emails?to=${email}&limit=5`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  expect(res.ok).toBeTruthy();
  const data = (await res.json()) as {
    data?: Array<{ id?: string; subject?: string; last_event?: string; to?: string[] }>;
  };
  const sent = (data.data ?? []).find(
    (e) => e.subject === 'Verifica tu cuenta de Pelis'
  );
  expect(sent, 'Debe existir un email OTP enviado vía Resend para el usuario').toBeDefined();
  expect(sent?.last_event).toBe('delivered');

  if (sent?.id) {
    const detail = await fetch(`https://api.resend.com/emails/${sent.id}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    expect(detail.ok).toBeTruthy();
    const emailDetail = (await detail.json()) as { html?: string };
    const html = emailDetail?.html ?? '';
    expect(html).toContain('/verify-email?email=');
    expect(html).toContain('Verificar mi cuenta');
  }
}

test.describe.configure({ mode: 'serial' });

test.describe('Email verification (OTP + Resend)', () => {
  const email = `2jhonatanjara2+otp-e2e-${Date.now()}@gmail.com`;
  const password = 'Test123456';

  test('registers, receives OTP via Resend, verifies email and logs in', async ({ page }) => {
    await page.goto('/register');

    await page.getByLabel(/nombre/i).fill('E2E OTP User');
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/^contraseña/i).fill(password);
    await page.getByLabel(/confirmar/i).fill(password);
    await page.getByRole('button', { name: /crear cuenta/i }).click();

    await page.waitForURL(/verify-email\?email=/);
    await expect(page.getByRole('heading', { name: /verifica tu email/i })).toBeVisible();

    const otp = getOtpFromConvex(email);
    expect(otp).toMatch(/^\d{6}$/);

    await assertEmailSentToResend(email);

    await page.getByPlaceholder('000000').fill('000000');
    await page.getByRole('button', { name: /verificar cuenta/i }).click();
    await expect(page.getByRole('alert')).toBeVisible();

    await page.getByPlaceholder('000000').fill(otp);
    await page.getByRole('button', { name: /verificar cuenta/i }).click();
    await expect(page.getByRole('heading', { name: /cuenta verificada/i })).toBeVisible();
    await page.waitForURL(/login\?verified=true/);

    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel('Contraseña', { exact: true }).fill(password);
    await page.getByRole('button', { name: /iniciar sesión/i }).click();
    await page.waitForURL('/', { timeout: 15000 });
    await expect(page).toHaveURL('/');
  });

  test('shows verified banner when logging in with a verified account', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel('Contraseña', { exact: true }).fill(password);
    await page.getByRole('button', { name: /iniciar sesión/i }).click();
    await page.waitForURL('/', { timeout: 15000 });
    await expect(page).toHaveURL('/');

    await page.goto('/login?verified=true');
    await expect(
      page.getByText(/¡email verificado! ahora puedes iniciar sesión/i)
    ).toBeVisible();
  });

  test('can resend the verification code from the verify page', async ({ page }) => {
    await page.goto(`/verify-email?email=${encodeURIComponent(email)}`);
    await expect(page.getByText(/¿no recibiste el código/i)).toBeVisible();

    await page.getByRole('button', { name: /reenviar código/i }).click();
    await expect(page.getByRole('button', { name: /\d+s/i })).toBeVisible({ timeout: 10000 });

    const otp = getOtpFromConvex(email);
    expect(otp).toMatch(/^\d{6}$/);
  });
});
