import type { RowDataPacket } from 'mysql2';
import { ROLE_ADMIN, ROLE_TECHNICIAN } from '@/lib/auth-session';
import { getDbPool } from '@/server/db';

type RequestIdRow = RowDataPacket & {
  request_id: number;
};

export async function ensureOverdueAutoRejectLogTable(): Promise<void> {
  const pool = getDbPool();
  await pool.execute(
    `CREATE TABLE IF NOT EXISTS request_overdue_auto_reject_log (
      request_id INT NOT NULL PRIMARY KEY,
      rejected_on DATE NOT NULL,
      rejected_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      email_sent TINYINT(1) NOT NULL DEFAULT 0,
      last_error VARCHAR(512) DEFAULT NULL,
      KEY idx_auto_reject_rejected_on (rejected_on)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  );
}

export async function resolveAutoRejectActorUserId(): Promise<string> {
  const fromEnv = process.env.AUTO_REJECT_ACTOR_USER_ID?.trim();
  if (fromEnv) return fromEnv;

  const pool = getDbPool();
  const [rows] = await pool.query<(RowDataPacket & { id: number })[]>(
    `SELECT id FROM users WHERE role_id IN (?, ?) ORDER BY id ASC LIMIT 1`,
    [ROLE_TECHNICIAN, ROLE_ADMIN],
  );
  if (!rows[0]) {
    throw new Error(
      'No technician or administrator account is available to record automated rejections. Set AUTO_REJECT_ACTOR_USER_ID or create a technician account.',
    );
  }
  return String(rows[0].id);
}

/** Requests past return date with no checkout — technician never handed equipment out. */
export async function listOverdueRequestsForAutoReject(runDateIso: string): Promise<number[]> {
  await ensureOverdueAutoRejectLogTable();
  const pool = getDbPool();
  const [rows] = await pool.query<RequestIdRow[]>(
    `SELECT DISTINCT r.request_id
     FROM request r
     WHERE r.rejected_at IS NULL
       AND r.return_date < ?
       AND NOT EXISTS (
         SELECT 1 FROM request_assignment ra
         WHERE ra.request_id = r.request_id AND ra.checkout_at IS NOT NULL
       )
     ORDER BY r.request_id`,
    [runDateIso],
  );
  return rows.map((row) => row.request_id);
}

export async function listOverdueAutoRejectEmailRetries(): Promise<number[]> {
  await ensureOverdueAutoRejectLogTable();
  const pool = getDbPool();
  const [rows] = await pool.query<RequestIdRow[]>(
    `SELECT request_id
     FROM request_overdue_auto_reject_log
     WHERE email_sent = 0
     ORDER BY request_id`,
  );
  return rows.map((row) => row.request_id);
}

export async function logOverdueAutoReject(
  requestId: number,
  rejectedOnIso: string,
  emailSent: boolean,
  lastError?: string | null,
): Promise<void> {
  const pool = getDbPool();
  await pool.execute(
    `INSERT INTO request_overdue_auto_reject_log (request_id, rejected_on, email_sent, last_error)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       email_sent = VALUES(email_sent),
       last_error = VALUES(last_error),
       rejected_at = CURRENT_TIMESTAMP`,
    [requestId, rejectedOnIso, emailSent ? 1 : 0, lastError?.trim() || null],
  );
}

export async function markOverdueAutoRejectEmailSent(requestId: number): Promise<void> {
  const pool = getDbPool();
  await pool.execute(
    `UPDATE request_overdue_auto_reject_log
     SET email_sent = 1, last_error = NULL
     WHERE request_id = ?`,
    [requestId],
  );
}
