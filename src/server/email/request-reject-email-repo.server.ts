import type { RowDataPacket } from 'mysql2';
import type { RequestRejectEmailData } from '@/lib/request-reject-email-types';
import { resolveAccountProfile } from '@/server/azure-directory.server';
import { getDbPool } from '@/server/db';

type RequestRejectEmailHeaderRow = RowDataPacket & {
  request_id: number;
  requested_by: string;
  borrow_date: Date | string;
  return_date: Date | string;
  program_type: string;
  usage_location: string;
  remarks: string | null;
  created_at: Date | string;
  rejected_at: Date | string;
  rejected_by: string;
  rejection_reason: string;
  requester_oid: string | null;
  requester_email: string | null;
  requester_phone: string | null;
  rejected_by_oid: string | null;
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
            r.program_type, r.usage_location, r.remarks, r.created_at,
            r.rejected_at, r.rejected_by, r.rejection_reason,
            u.oid AS requester_oid, u.email AS requester_email, u.phone AS requester_phone,
            rej.oid AS rejected_by_oid
     FROM request r
     INNER JOIN users u ON u.id = r.requested_by
     LEFT JOIN users rej ON rej.id = r.rejected_by
     WHERE r.request_id = ? AND r.rejected_at IS NOT NULL
     LIMIT 1`,
    [requestId],
  );

  const row = headers[0];
  if (!row) return null;

  const profile = await resolveAccountProfile(row.requester_oid, {
    email: row.requester_email,
    phone: row.requester_phone,
  });

  if (!profile.email.includes('@')) {
    throw new Error(
      'The rejection notice could not be sent because the requester has no email on file. Update their profile or contact IT.',
    );
  }

  const rejectedByProfile = await resolveAccountProfile(row.rejected_by_oid);

  const [items] = await pool.query<RequestRejectEmailItemRow[]>(
    `SELECT asset_type, quantity FROM request_item WHERE request_id = ? ORDER BY request_item_id`,
    [requestId],
  );

  return {
    requestId: row.request_id,
    requestedBy: String(row.requested_by),
    requesterName: profile.fullName || String(row.requested_by),
    requesterEmail: profile.email,
    requesterPhone: profile.phone,
    borrowDate: formatDateOnly(row.borrow_date),
    returnDate: formatDateOnly(row.return_date),
    programType: row.program_type,
    usageLocation: row.usage_location,
    remarks: row.remarks?.trim() || null,
    submittedAt: formatDateTime(row.created_at) ?? formatDateOnly(row.borrow_date),
    rejectedAt: formatDateTime(row.rejected_at) ?? '',
    rejectedBy: String(row.rejected_by),
    rejectedByName: rejectedByProfile.fullName || String(row.rejected_by),
    rejectionReason: row.rejection_reason.trim(),
    items: items.map((i) => ({
      assetType: i.asset_type,
      quantity: i.quantity,
    })),
  };
}
