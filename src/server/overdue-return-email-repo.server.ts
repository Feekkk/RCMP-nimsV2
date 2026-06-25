import type { RowDataPacket } from 'mysql2';
import type { OverdueReturnEmailData } from '@/lib/overdue-return-email-types';
import { getRequestEmailData } from '@/server/request-email-repo.server';
import { getDbPool } from '@/server/db';
import { getOverdueEmailScheduleConfig, getTodayIsoInTimeZone } from '@/lib/overdue-email-schedule';
import { isoToLocalDate, localDateToIso } from '@/lib/date-format';

type OverdueRequestRow = RowDataPacket & {
  request_id: number;
};

type OutstandingAssetRow = RowDataPacket & {
  assignment_id: number;
  asset_id: number;
  checkout_at: Date | string;
  model: string | null;
  brand: string | null;
  serial_num: string | null;
  asset_type: string | null;
  pool_kind: string | null;
};

function formatDateTime(val: Date | string | null): string {
  if (val == null) return '—';
  if (val instanceof Date) return val.toISOString().replace('T', ' ').slice(0, 19);
  const s = String(val);
  return s.includes('T') ? s.replace('T', ' ').slice(0, 19) : s.slice(0, 19);
}

function daysOverdue(returnDateIso: string, runDateIso: string): number {
  const returnDay = isoToLocalDate(returnDateIso);
  const runDay = isoToLocalDate(runDateIso);
  if (!returnDay || !runDay) return 0;
  return Math.max(
    0,
    Math.round((runDay.getTime() - returnDay.getTime()) / 86_400_000),
  );
}

/** One row per calendar day per request — prevents duplicate sends when the job runs more than once. */
export async function ensureOverdueEmailLogTable(): Promise<void> {
  const pool = getDbPool();
  await pool.execute(
    `CREATE TABLE IF NOT EXISTS request_overdue_email_log (
      log_id INT AUTO_INCREMENT PRIMARY KEY,
      request_id INT NOT NULL,
      sent_on DATE NOT NULL,
      sent_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      days_overdue INT NOT NULL,
      UNIQUE KEY uq_request_overdue_sent_on (request_id, sent_on),
      KEY idx_overdue_email_sent_on (sent_on)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  );
}

export async function listOverdueRequestIdsForEmail(runDateIso: string): Promise<number[]> {
  await ensureOverdueEmailLogTable();
  const pool = getDbPool();
  const [rows] = await pool.query<OverdueRequestRow[]>(
    `SELECT DISTINCT r.request_id
     FROM request r
     INNER JOIN request_assignment ra ON ra.request_id = r.request_id
     WHERE r.rejected_at IS NULL
       AND r.return_date < ?
       AND ra.checkout_at IS NOT NULL
       AND ra.returned_at IS NULL
       AND ra.asset_id IS NOT NULL
       AND NOT EXISTS (
         SELECT 1 FROM request_overdue_email_log l
         WHERE l.request_id = r.request_id AND l.sent_on = ?
       )
     ORDER BY r.request_id`,
    [runDateIso, runDateIso],
  );
  return rows.map((r) => r.request_id);
}

export async function logOverdueEmailSent(
  requestId: number,
  sentOnIso: string,
  daysOverdueCount: number,
): Promise<void> {
  const pool = getDbPool();
  await pool.execute(
    `INSERT INTO request_overdue_email_log (request_id, sent_on, days_overdue)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE days_overdue = VALUES(days_overdue), sent_at = CURRENT_TIMESTAMP`,
    [requestId, sentOnIso, daysOverdueCount],
  );
}

export async function getOverdueReturnEmailData(
  requestId: number,
  runDateIso: string,
): Promise<OverdueReturnEmailData | null> {
  const base = await getRequestEmailData(requestId);
  if (!base) return null;

  const overdueDays = daysOverdue(base.returnDate, runDateIso);
  if (overdueDays <= 0) return null;

  const pool = getDbPool();
  const [assetRows] = await pool.query<OutstandingAssetRow[]>(
    `SELECT ra.assignment_id, ra.asset_id, ra.checkout_at,
            COALESCE(l.model, av.model) AS model,
            COALESCE(l.brand, av.brand) AS brand,
            COALESCE(l.serial_num, av.serial_num) AS serial_num,
            ri.asset_type,
            IF(l.asset_id IS NOT NULL, 'laptop', 'av') AS pool_kind
     FROM request_assignment ra
     LEFT JOIN request_item ri ON ri.request_item_id = ra.request_item_id
     LEFT JOIN laptop l ON l.asset_id = ra.asset_id
     LEFT JOIN av av ON av.asset_id = ra.asset_id
     WHERE ra.request_id = ?
       AND ra.checkout_at IS NOT NULL
       AND ra.returned_at IS NULL
       AND ra.asset_id IS NOT NULL
     ORDER BY ra.assignment_id`,
    [requestId],
  );

  if (assetRows.length === 0) return null;

  const assets = assetRows.map((r) => {
    const kind = r.pool_kind === 'laptop' ? ('laptop' as const) : ('av' as const);
    return {
      assignmentId: r.assignment_id,
      assetId: r.asset_id,
      kind,
      assetType: r.asset_type?.trim() || (kind === 'laptop' ? 'Laptop' : 'AV equipment'),
      model: r.model?.trim() || '—',
      brand: r.brand?.trim() || '—',
      serialNum: r.serial_num?.trim() || '—',
      checkoutAt: formatDateTime(r.checkout_at),
    };
  });

  return {
    requestId: base.requestId,
    requestedBy: base.requestedBy,
    requesterName: base.requesterName,
    requesterEmail: base.requesterEmail,
    requesterPhone: base.requesterPhone,
    borrowDate: base.borrowDate,
    returnDate: base.returnDate,
    programType: base.programType,
    usageLocation: base.usageLocation,
    remarks: base.remarks,
    submittedAt: base.submittedAt,
    requestedItems: base.items,
    daysOverdue: overdueDays,
    outstandingCount: assets.length,
    assets,
  };
}

/** Resolve run date when callers omit it (job default = today in configured TZ). */
export function resolveOverdueEmailRunDate(runDateIso?: string): string {
  if (runDateIso?.trim()) {
    const parsed = isoToLocalDate(runDateIso.trim());
    if (parsed) return localDateToIso(parsed);
  }
  return getTodayIsoInTimeZone(getOverdueEmailScheduleConfig().tz);
}
