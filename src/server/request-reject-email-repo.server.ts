import type { RowDataPacket } from 'mysql2';
import type { RequestRejectEmailData } from '@/lib/request-reject-email-types';
import { getDbPool } from '@/server/db';

type RequestRejectEmailHeaderRow = RowDataPacket & {
  request_id: number;
  requested_by: string;
  borrow_date: Date | string;
  return_date: Date | string;
  program_type: string;
  usage_location: string;
  reason: string | null;
  created_at: Date | string;
  rejected_at: Date | string;
  rejected_by: string;
  rejection_reason: string;
  requester_name: string | null;
  requester_email: string | null;
  requester_phone: string | null;
  rejected_by_name: string | null;
};

type RequestRejectEmailItemRow = RowDataPacket & {
  asset_type: string;
  quantity: number;
};

function formatDateOnly(val: Date | string): string {
  if (val instanceof Date) return val.toISOString().slice(0, 10);
  return String(val).slice(0, 10);
}

function formatDateTime(val: Date | string | null): string | null {
  if (val == null) return null;
  if (val instanceof Date) return val.toISOString().replace('T', ' ').slice(0, 19);
  const s = String(val);
  return s.includes('T') ? s.replace('T', ' ').slice(0, 19) : s.slice(0, 19);
}

export async function getRequestRejectEmailData(
  requestId: number,
): Promise<RequestRejectEmailData | null> {
  const pool = getDbPool();
  const [headers] = await pool.query<RequestRejectEmailHeaderRow[]>(
    `SELECT r.request_id, r.requested_by, r.borrow_date, r.return_date,
            r.program_type, r.usage_location, r.reason, r.created_at,
            r.rejected_at, r.rejected_by, r.rejection_reason,
            u.full_name AS requester_name, u.email AS requester_email, u.phone AS requester_phone,
            rej.full_name AS rejected_by_name
     FROM request r
     INNER JOIN users u ON u.staff_id = r.requested_by
     LEFT JOIN users rej ON rej.staff_id = r.rejected_by
     WHERE r.request_id = ? AND r.rejected_at IS NOT NULL
     LIMIT 1`,
    [requestId],
  );

  const row = headers[0];
  if (!row) return null;

  const email = row.requester_email?.trim();
  if (!email || !email.includes('@')) {
    throw new Error(
      'Cannot send rejection email: requester has no email on file. Update their profile or contact IT.',
    );
  }

  const [items] = await pool.query<RequestRejectEmailItemRow[]>(
    `SELECT asset_type, quantity FROM request_item WHERE request_id = ? ORDER BY request_item_id`,
    [requestId],
  );

  return {
    requestId: row.request_id,
    requestedBy: row.requested_by,
    requesterName: row.requester_name?.trim() || row.requested_by,
    requesterEmail: email,
    requesterPhone: row.requester_phone?.trim() || null,
    borrowDate: formatDateOnly(row.borrow_date),
    returnDate: formatDateOnly(row.return_date),
    programType: row.program_type,
    usageLocation: row.usage_location,
    reason: row.reason?.trim() || null,
    submittedAt: formatDateTime(row.created_at) ?? formatDateOnly(row.borrow_date),
    rejectedAt: formatDateTime(row.rejected_at) ?? '',
    rejectedBy: row.rejected_by,
    rejectedByName: row.rejected_by_name?.trim() || row.rejected_by,
    rejectionReason: row.rejection_reason.trim(),
    items: items.map((i) => ({
      assetType: i.asset_type,
      quantity: i.quantity,
    })),
  };
}
