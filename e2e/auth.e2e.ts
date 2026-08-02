import { test, expect } from '@playwright/test';

test.describe('Registration Flow', () => {
  const testUser = {
    name: 'Test User',
    email: `test-${Date.now()}@example.com`,
    password: 'Test123456',
  };

  test('should show registration form', async ({ page }) => {
    await page.goto('/register');

    await expect(page.getByRole('heading', { name: /crear cuenta/i })).toBeVisible();
    await expect(page.getByLabel(/nombre/i)).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel('Contraseña', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: /crear cuenta/i })).toBeVisible();
  });

  test('should show error for mismatched passwords', async ({ page }) => {
    await page.goto('/register');

    await page.getByLabel(/nombre/i).fill(testUser.name);
    await page.getByLabel(/email/i).fill(testUser.email);
    await page.getByLabel(/^contraseña/i).fill(testUser.password);
    await page.getByLabel(/confirmar/i).fill('different');
    await page.getByRole('button', { name: /crear cuenta/i }).click();

    await expect(page.getByRole('alert').filter({ hasText: /no coinciden/i })).toBeVisible();
  });

  test('should register a new user and be redirected to email verification', async ({ page }) => {
    await page.goto('/register');

    await page.getByLabel(/nombre/i).fill(testUser.name);
    await page.getByLabel(/email/i).fill(testUser.email);
    await page.getByLabel(/^contraseña/i).fill(testUser.password);
    await page.getByLabel(/confirmar/i).fill(testUser.password);
    await page.getByRole('button', { name: /crear cuenta/i }).click();

    await page.waitForURL(/verify-email\?email=/, { timeout: 10000 });
    await expect(page.getByRole('heading', { name: /verifica tu email/i })).toBeVisible();
  });

  test('should show error for duplicate email', async ({ page, request }) => {
    const res = await request.post('/api/auth/sign-up/email', {
      data: { name: testUser.name, email: testUser.email, password: testUser.password },
    });
    expect(res.ok()).toBeTruthy();

    await page.goto('/register');

    await page.getByLabel(/nombre/i).fill(testUser.name);
    await page.getByLabel(/email/i).fill(testUser.email);
    await page.getByLabel(/^contraseña/i).fill(testUser.password);
    await page.getByLabel(/confirmar/i).fill(testUser.password);
    await page.getByRole('button', { name: /crear cuenta/i }).click();

    await expect(
      page.getByRole('alert').filter({ hasText: /ya existe|already exists|exist/i })
    ).toBeVisible();
  });
});

test.describe('Login Flow', () => {
  const testUser = {
    email: `test-${Date.now()}@example.com`,
    password: 'Test123456',
  };

  test('should show login form', async ({ page }) => {
    await page.goto('/login');

    await expect(page.getByRole('heading', { name: /iniciar sesión/i })).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel('Contraseña', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: /iniciar sesión/i })).toBeVisible();
  });

  test('should prompt to verify email for unknown credentials', async ({ page }) => {
    await page.goto('/login');

    await page.getByLabel(/email/i).fill('nonexistent@test.com');
    await page.getByLabel('Contraseña', { exact: true }).fill('wrongpassword');
    await page.getByRole('button', { name: /iniciar sesión/i }).click();

    await expect(page.getByText(/debes verificar tu email/i)).toBeVisible();
  });
});
