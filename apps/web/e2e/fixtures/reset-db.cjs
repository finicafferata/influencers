/**
 * Clears contact + notification state so the core-loop e2e is deterministic on
 * repeat runs. Run as a plain-Node subprocess (keeps `pg` out of Playwright's
 * module graph). The seed never creates Contacts/Notifications, so truncating
 * them is safe for the test database.
 *
 * Usage: node reset-db.cjs <databaseUrl>
 */
const { Client } = require('pg');

(async () => {
  const [, , dbUrl] = process.argv;
  if (!dbUrl) {
    process.stderr.write('usage: reset-db.cjs <databaseUrl>');
    process.exit(64);
  }
  const client = new Client({ connectionString: dbUrl });
  await client.connect();
  try {
    await client.query('TRUNCATE "Contact", "Notification" RESTART IDENTITY CASCADE');
  } finally {
    await client.end();
  }
})().catch((err) => {
  process.stderr.write(String(err && err.message ? err.message : err));
  process.exit(1);
});
