import { readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { config } from 'dotenv';
import type { RowDataPacket } from 'mysql2';

config({ path: resolve(process.cwd(), '.env') });
config({ path: resolve(process.cwd(), '.env.local'), override: true });

const DUPLICATE_CODES = new Set(['ER_DUP_FIELDNAME', 'ER_DUP_KEYNAME']);

function statements(sql: string): string[] {
  return sql
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean);
}

function errorCode(error: unknown): string {
  return typeof error === 'object' && error && 'code' in error ? String((error as { code: unknown }).code) : '';
}

async function main() {
  const { getDbPool } = await import('../server/core/db');
  const pool = getDbPool();
  await pool.execute(
    `CREATE TABLE IF NOT EXISTS schema_migrations (
      filename VARCHAR(255) NOT NULL PRIMARY KEY,
      applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  );

  const dir = resolve(process.cwd(), 'backend/migrations');
  const files = (await readdir(dir)).filter((name) => name.endsWith('.sql')).sort();
  const [appliedRows] = await pool.query<(RowDataPacket & { filename: string })[]>(
    'SELECT filename FROM schema_migrations',
  );
  const applied = new Set(appliedRows.map((row) => row.filename));

  for (const filename of files) {
    if (applied.has(filename)) {
      console.log(`skip ${filename}`);
      continue;
    }
    const sql = await readFile(resolve(dir, filename), 'utf8');
    for (const statement of statements(sql)) {
      try {
        await pool.query(statement);
      } catch (error) {
        if (!DUPLICATE_CODES.has(errorCode(error))) throw error;
        console.log(`already present in ${filename}: ${errorCode(error)}`);
      }
    }
    await pool.execute('INSERT INTO schema_migrations (filename) VALUES (?)', [filename]);
    console.log(`applied ${filename}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
