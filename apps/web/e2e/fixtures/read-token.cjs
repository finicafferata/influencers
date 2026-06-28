/**
 * Standalone token reader, run as a plain-Node subprocess by the e2e auth fixture.
 *
 * Kept out of Playwright's module graph on purpose: `pg` (8.13+) ships a
 * `cloudflare:sockets` conditional export that breaks Playwright's resolver on
 * Node 24. Running it here under vanilla Node's CJS loader avoids that entirely.
 *
 * Usage: node read-token.cjs <email> <databaseUrl>
 * Prints the newest unused magic-link token to stdout, or exits non-zero.
 */
const { Client } = require('pg');

(async () => {
  const [, , email, dbUrl] = process.argv;
  if (!email || !dbUrl) {
    process.stderr.write('usage: read-token.cjs <email> <databaseUrl>');
    process.exit(64);
  }
  const client = new Client({ connectionString: dbUrl });
  await client.connect();
  try {
    const { rows } = await client.query(
      `SELECT t.token
         FROM "MagicLinkToken" t
         JOIN "User" u ON u.id = t."userId"
        WHERE u.email = $1 AND t.used = false
        ORDER BY t."createdAt" DESC
        LIMIT 1`,
      [email],
    );
    if (!rows[0]) {
      process.stderr.write('NO_TOKEN');
      process.exit(2);
    }
    process.stdout.write(rows[0].token);
  } finally {
    await client.end();
  }
})().catch((err) => {
  process.stderr.write(String(err && err.message ? err.message : err));
  process.exit(1);
});
