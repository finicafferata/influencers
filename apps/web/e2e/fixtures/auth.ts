import { execFileSync } from 'node:child_process';
import path from 'node:path';
import type { Page, APIRequestContext } from '@playwright/test';

/**
 * Deterministic, unattended magic-link auth for e2e (Spec 001, FR-005).
 *
 * The API never returns the magic-link token over HTTP (it's emailed / dev-logged),
 * so we request a link, then read the freshest token straight from Postgres and
 * drive the real verify flow in the browser. No log scraping, no email.
 *
 * The DB read is delegated to `read-token.cjs` run as a plain-Node subprocess so
 * `pg` stays out of Playwright's module graph (its conditional exports break
 * Playwright's resolver on Node 24).
 */

const DATABASE_URL =
  process.env.DATABASE_URL ??
  'postgresql://postgres:postgres@localhost:5432/creatorlink?schema=public';

const READER = path.join(__dirname, 'read-token.cjs');
const RESETTER = path.join(__dirname, 'reset-db.cjs');

/** Clear contact + notification state so the core-loop test is re-runnable. */
export function resetContactState(): void {
  execFileSync('node', [RESETTER, DATABASE_URL], { encoding: 'utf8' });
}

/** Newest unused magic-link token for an email, read directly from the DB. */
export async function latestMagicLinkToken(email: string): Promise<string> {
  try {
    return execFileSync('node', [READER, email, DATABASE_URL], {
      encoding: 'utf8',
    }).trim();
  } catch {
    throw new Error(`No magic-link token found for ${email}`);
  }
}

/**
 * Sign `page` in as `email` and land on /dashboard.
 * Goes through the real proxy → API → DB → verify flow so the httpOnly `session`
 * cookie is set exactly as in production.
 */
export async function loginAs(page: Page, email: string): Promise<void> {
  const res = await page.request.post('/api/auth/magic-link', { data: { email } });
  if (!res.ok()) {
    throw new Error(`magic-link request failed for ${email}: ${res.status()}`);
  }

  const token = await latestMagicLinkToken(email);
  await page.goto(`/auth/verify?token=${encodeURIComponent(token)}`);
  await page.waitForURL('**/dashboard', { timeout: 15_000 });
}

/** Request a link and return its token without consuming it (for reuse tests). */
export async function requestMagicLink(
  request: APIRequestContext,
  email: string,
): Promise<string> {
  const res = await request.post('/api/auth/magic-link', { data: { email } });
  if (!res.ok()) {
    throw new Error(`magic-link request failed for ${email}: ${res.status()}`);
  }
  return latestMagicLinkToken(email);
}
