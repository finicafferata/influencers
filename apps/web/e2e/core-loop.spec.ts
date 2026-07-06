import { test, expect } from '@playwright/test';
import { loginAs, resetContactState } from './fixtures/auth';

// Start from a clean contact/notification state so the loop is deterministic on
// repeat runs (after acceptance the brand's card stays "Contactado" otherwise).
test.beforeAll(() => resetContactState());

/**
 * The MVP "heartbeat" (US2): brand signs in → searches → contacts a creator with a
 * message + brief → that creator signs in → sees the proposal → accepts it.
 *
 * Re-runnable: the loop ends by accepting, which clears the "one pending contact per
 * (sender, creator)" partial-unique index, so a subsequent run can send again.
 */
test('brand → creator heartbeat: search, contact, accept', async ({ page, context }) => {
  const marker = `e2e propuesta ${Date.now()}`;

  // 1. Brand signs in and lands on the dashboard.
  await loginAs(page, 'brand@example.com');

  // 2. Search lists seeded published creators.
  await page.goto('/search');
  const maria = page.getByText('@mariag').first();
  await expect(maria).toBeVisible({ timeout: 15_000 });

  // 3. Open the creator and start a contact.
  await maria.click();
  await page.getByRole('button', { name: 'Contactar' }).first().click();

  // 4. Fill and send the proposal.
  await expect(page.getByText('Contactar creador')).toBeVisible();
  const fields = page.locator('textarea:visible');
  await fields.first().fill(marker);
  await fields.nth(1).fill('Brief: colaboración de prueba e2e.');
  await page.getByRole('button', { name: 'Enviar propuesta' }).click();
  await expect(page.getByText('¡Propuesta enviada!')).toBeVisible();

  // 5. Switch to the targeted creator.
  await context.clearCookies();
  await loginAs(page, 'maria@example.com');

  // 6. The proposal shows up and can be accepted.
  await page.goto('/dashboard/contacts');
  await expect(page.getByText('Propuestas recibidas')).toBeVisible();
  await expect(page.getByText(marker)).toBeVisible();
  await expect(page.getByText('Cosmética Natural SA')).toBeVisible();

  await page.getByRole('button', { name: 'Aceptar' }).first().click();
  await expect(page.getByText('Aceptada').first()).toBeVisible();
});
