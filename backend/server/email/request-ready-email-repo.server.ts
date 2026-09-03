import type { RowDataPacket } from 'mysql2';
import type { RequestReadyEmailData } from '@shared/lib/request-ready-email-types';
import { sqlDateToIso as formatDateOnly } from '@shared/lib/date-format';
import { resolveAccountProfile } from '@backend/server/core/azure-directory.server';
import { getDbPool } from '@backend/server/core/db';

type HeaderRow = RowDataPacket & {
  request_id: number;
  borrow_date: Date | string;
  return_date: Date | string;
  requester_oid: string | null;
  requester_email: string | null;
  requester_phone: string | null;
};

export async function getRequestReadyEmailData(
  requestId: number,
): Promise<RequestReadyEmailData | null> {
  const pool = getDbPool();
  const [headers] = await pool.query<HeaderRow[]>(
    `SELECT r.request_id, r.borrow_date, r.return_date,
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
      'The collection email could not be sent because the requester has no email on file.',
    );
  }

  return {
    requestId: row.request_id,
    requesterName: profile.fullName || 'Requester',
    requesterEmail: profile.email,
    borrowDate: formatDateOnly(row.borrow_date),
    returnDate: formatDateOnly(row.return_date),
  };
}
