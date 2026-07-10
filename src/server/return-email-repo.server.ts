import type { RowDataPacket } from 'mysql2';
import type { ReturnEmailStatus, ReturnEmailStatusInfo } from '@/lib/return-pdf-types';
import { getDbPool } from '@/server/db';

export async function markReturnEmailStatus(
  returnId: number,
  status: ReturnEmailStatus,
  error?: string | null,
): Promise<void> {
  const pool = getDbPool();
  if (status === 'sent') {
    await pool.execute(
      `UPDATE handover_return SET email_status = ?, email_sent_at = NOW(), email_error = NULL WHERE return_id = ?`,
      [status, returnId],
    );
    return;
  }
  await pool.execute(
    `UPDATE handover_return SET email_status = ?, email_error = ? WHERE return_id = ?`,
    [status, error ?? null, returnId],
  );
}

export async function getReturnEmailStatus(returnId: number): Promise<ReturnEmailStatusInfo | null> {
  const pool = getDbPool();
  const [rows] = await pool.query<
    (RowDataPacket & { email_status: ReturnEmailStatus; email_error: string | null; email_sent_at: Date | string | null })[]
  >(`SELECT email_status, email_error, email_sent_at FROM handover_return WHERE return_id = ? LIMIT 1`, [
    returnId,
  ]);
  const row = rows[0];
  if (!row) return null;
  return {
    status: row.email_status,
    error: row.email_error,
    sentAt: row.email_sent_at ? new Date(row.email_sent_at).toISOString() : null,
  };
}
