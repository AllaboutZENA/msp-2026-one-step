import pg from 'pg';
import { runMigrations } from '../src/migrations.js';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('DATABASE_URL is not set (see apps/api/.env.example)');
  process.exit(1);
}

const client = new pg.Client({ connectionString: databaseUrl });
await client.connect();
try {
  const applied = await runMigrations(client);
  for (const file of applied) console.log(`applied ${file}`);
  console.log(applied.length ? `${applied.length} migration(s) applied` : 'database is up to date');
} finally {
  await client.end();
}
