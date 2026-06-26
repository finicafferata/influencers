import { test, expect } from '@playwright/test';
import { loginAs, requestMagicLink, latestMagicLinkToken } from './fixtures/auth';

const API_URL = process.env.API_URL ?? 'http://localhost:3002';

test.describe('Magic-link auth (US3)', () => {
  test('brand signs in and lands on the dashboard with search', async ({ page }) => {
    await loginAs(page, 'brand@example.com');
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByText('Buscar creadores').first()).toBeVisible();
  });

  test('creator signs in and lands on the dashboard', async ({ page }) => {
    await loginAs(page, 'maria@example.com');
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByText('Propuestas recibidas').first()).toBeVisible();
  });

  test('a magic-link token is single-use', async ({ page }) => {
    const token = await requestMagicLink(page.request, 'tomas@example.com');

    // First use succeeds…
    const first = await page.request.get(
      `${API_URL}/auth/verify?token=${encodeURIComponent(token)}`,
    );
    expect(first.ok()).toBeTruthy();

    // …the same token is rejected on reuse.
    const second = await page.request.get(
      `${API_URL}/auth/verify?token=${encodeURIComponent(token)}`,
    );
    expect(second.status()).toBe(401);
  });

  test('an unknown token is rejected', async ({ page }) => {
    const res = await page.request.get(
      `${API_URL}/auth/verify?token=deadbeefdoesnotexist`,
    );
    expect(res.status()).toBe(401);
    // sanity: the helper throws for an email with no token
    await expect(latestMagicLinkToken('nobody@example.com')).rejects.toThrow();
  });
});
