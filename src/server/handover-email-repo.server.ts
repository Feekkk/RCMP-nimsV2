import type { RowDataPacket } from 'mysql2';
import type { HandoverEmailStatus, HandoverEmailStatusInfo } from '@/lib/handover-pdf-types';
import { getDbPool } from '@/server/db';

export async function markHandoverEmailStatus(
  handoverId: number,
  status: HandoverEmailStatus,
  error?: string | null,
): Promise<void> {
  const pool = getDbPool();
  if (status === 'sent') {
    await pool.execute(
      `UPDATE handover SET email_status = ?, email_sent_at = NOW(), email_error = NULL WHERE handover_id = ?`,
      [status, handoverId],
    );
    return;
  }
  await pool.execute(
    `UPDATE handover SET email_status = ?, email_error = ? WHERE handover_id = ?`,
    [status, error ?? null, handoverId],
  );
}

export async function getHandoverEmailStatus(
  handoverId: number,
): Promise<HandoverEmailStatusInfo | null> {
  const pool = getDbPool();
  const [rows] = await pool.query<
    (RowDataPacket & {
      email_status: HandoverEmailStatus;
      email_error: string | null;
      email_sent_at: Date | string | null;
    })[]
  >(`SELECT email_status, email_error, email_sent_at FROM handover WHERE handover_id = ? LIMIT 1`, [
    handoverId,
  ]);
  const row = rows[0];
  if (!row) return null;
  return {
    status: row.email_status,
    error: row.email_error,
    sentAt: row.email_sent_at ? new Date(row.email_sent_at).toISOString() : null,
  };
}
