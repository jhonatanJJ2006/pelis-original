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
    await expect(page.getByLabel(/contraseña/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /crear cuenta/i })).toBeVisible();
  });

  test('should show error for mismatched passwords', async ({ page }) => {
    await page.goto('/register');

    await page.getByLabel(/nombre/i).fill(testUser.name);
    await page.getByLabel(/email/i).fill(testUser.email);
    await page.getByLabel(/^contraseña/i).fill(testUser.password);
    await page.getByLabel(/confirmar/i).fill('different');
    await page.getByRole('button', { name: /crear cuenta/i }).click();

    await expect(page.getByRole('alert')).toBeVisible();
  });

  test('should register a new user successfully', async ({ page }) => {
    await page.goto('/register');

    await page.getByLabel(/nombre/i).fill(testUser.name);
    await page.getByLabel(/email/i).fill(testUser.email);
    await page.getByLabel(/^contraseña/i).fill(testUser.password);
    await page.getByLabel(/confirmar/i).fill(testUser.password);
    await page.getByRole('button', { name: /crear cuenta/i }).click();

    await page.waitForURL('/', { timeout: 10000 });
    await expect(page).toHaveURL('/');
  });

  test('should show error for duplicate email', async ({ page }) => {
    await page.goto('/register');

    await page.getByLabel(/nombre/i).fill(testUser.name);
    await page.getByLabel(/email/i).fill(testUser.email);
    await page.getByLabel(/^contraseña/i).fill(testUser.password);
    await page.getByLabel(/confirmar/i).fill(testUser.password);
    await page.getByRole('button', { name: /crear cuenta/i }).click();

    await expect(page.getByRole('alert')).toBeVisible();
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
    await expect(page.getByLabel(/contraseña/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /iniciar sesión/i })).toBeVisible();
  });

  test('should show error for wrong credentials', async ({ page }) => {
    await page.goto('/login');

    await page.getByLabel(/email/i).fill('nonexistent@test.com');
    await page.getByLabel(/contraseña/i).fill('wrongpassword');
    await page.getByRole('button', { name: /iniciar sesión/i }).click();

    await expect(page.getByRole('alert')).toBeVisible();
  });
});
