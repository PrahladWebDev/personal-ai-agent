import fs from 'fs';
import path from 'path';
import { pool } from './pool';

/**
 * Runs every .sql file in database/migrations in filename order.
 * Tracks applied migrations in a `schema_migrations` table so it is safe
 * to run repeatedly (idempotent) on container start.
 */
function resolveMigrationsDir(): string {
  // In the Docker image, database/ is copied to /app/database (sibling of
  // dist/), so from dist/database/migrate.js that's ../../database/migrations.
  // In local dev (ts-node against src/), this file lives at
  // backend/src/database/migrate.ts and the repo's database/ folder is two
  // levels above backend/, i.e. ../../../database/migrations.
  const candidates = [
    path.resolve(__dirname, '../../database/migrations'),
    path.resolve(__dirname, '../../../database/migrations'),
  ];
  const found = candidates.find((p) => fs.existsSync(p));
  if (!found) {
    throw new Error(`Could not locate database/migrations. Tried:\n${candidates.join('\n')}`);
  }
  return found;
}

async function migrate() {
  const migrationsDir = resolveMigrationsDir();

  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const { rows } = await pool.query(
      'SELECT 1 FROM schema_migrations WHERE filename = $1',
      [file]
    );
    if (rows.length > 0) continue;

    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
    console.log(`Applying migration: ${file}`);
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [file]);
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      console.error(`Migration failed: ${file}`, err);
      throw err;
    } finally {
      client.release();
    }
  }

  console.log('Migrations complete.');
}

migrate()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
