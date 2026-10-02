import { getDbPool } from '@backend/server/core/db';

const MAX_ERROR_LENGTH = 300;

let tableReady: Promise<void> | null = null;

export function staffVisibleEmailError(error: unknown): string {
  const message = error instanceof Error ? error.message : 'The confirmation email could not be sent.';
  const cleaned = message.replace(/\s+/g, ' ').trim();
  return (cleaned || 'The confirmation email could not be sent.').slice(0, MAX_ERROR_LENGTH);
}

export async function ensureRequestEmailFailureTable(): Promise<void> {
  if (!tableReady) {
    tableReady = (async () => {
      const pool = getDbPool();
      await pool.execute(
        `CREATE TABLE IF NOT EXISTS request_email_failure (
          request_id INT NOT NULL PRIMARY KEY,
          attempts INT NOT NULL,
          last_error VARCHAR(500) NOT NULL,
          updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
      );
    })().catch((error) => {
      tableReady = null;
      throw error;
    });
  }
  await tableReady;
}

export async function recordRequestEmailFailure(requestId: number, error: unknown, attempts: number): Promise<void> {
  await ensureRequestEmailFailureTable();
  const pool = getDbPool();
  await pool.execute(
    `INSERT INTO request_email_failure (request_id, attempts, last_error)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE attempts = VALUES(attempts), last_error = VALUES(last_error)`,
    [requestId, attempts, staffVisibleEmailError(error)],
  );
}

export async function clearRequestEmailFailure(requestId: number): Promise<void> {
  await ensureRequestEmailFailureTable();
  const pool = getDbPool();
  await pool.execute('DELETE FROM request_email_failure WHERE request_id = ?', [requestId]);
}
