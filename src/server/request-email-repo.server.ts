import type { RowDataPacket } from 'mysql2';
import type { RequestEmailData } from '@/lib/request-email-types';
import { resolveAccountProfile } from '@/server/azure-directory.server';
import { getDbPool } from '@/server/db';

type RequestEmailHeaderRow = RowDataPacket & {
  request_id: number;
  requested_by: string;
  borrow_date: Date | string;
  return_date: Date | string;
  program_type: string;
  usage_location: string;
  reason: string | null;
  created_at: Date | string;
  terms_accepted_at: Date | string | null;
  requester_oid: string | null;
  requester_email: string | null;
  requester_phone: string | null;
};

type RequestEmailItemRow = RowDataPacket & {
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

export async function getRequestEmailData(requestId: number): Promise<RequestEmailData | null> {
  const pool = getDbPool();
  const [headers] = await pool.query<RequestEmailHeaderRow[]>(
    `SELECT r.request_id, r.requested_by, r.borrow_date, r.return_date,
            r.program_type, r.usage_location, r.reason, r.created_at, r.terms_accepted_at,
            u.oid AS requester_oid, u.email AS requester_email, u.phone AS requester_phone
     FROM request r
     INNER JOIN users u ON u.id = r.requested_by
     WHERE r.request_id = ?
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
      'Cannot send request email: your account has no email on file. Update your profile or contact IT.',
    );
  }

  const [items] = await pool.query<RequestEmailItemRow[]>(
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
    reason: row.reason?.trim() || null,
    submittedAt: formatDateTime(row.created_at) ?? formatDateOnly(row.borrow_date),
    termsAcceptedAt: formatDateTime(row.terms_accepted_at),
    items: items.map((i) => ({
      assetType: i.asset_type,
      quantity: i.quantity,
    })),
  };
}
