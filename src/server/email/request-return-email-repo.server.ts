import type { RowDataPacket } from 'mysql2';
import type { RequestReturnEmailData } from '@/lib/request-return-email-types';
import { getDisplayNameByOid } from '@/server/azure-directory.server';
import { getRequestEmailData } from '@/server/request-email-repo.server';
import { getDbPool } from '@/server/db';

type ReturnAssetRow = RowDataPacket & {
  assignment_id: number;
  asset_id: number;
  checkout_at: Date | string | null;
  returned_at: Date | string;
  return_condition: string | null;
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

export async function getRequestReturnEmailData(
  requestId: number,
  returnedBy: string,
  assignmentIds: number[],
  returnCondition: string,
  returnRemarks: string | null,
): Promise<RequestReturnEmailData | null> {
  if (assignmentIds.length === 0) return null;

  const base = await getRequestEmailData(requestId);
  if (!base) return null;

  const pool = getDbPool();
  const placeholders = assignmentIds.map(() => '?').join(', ');

  const [techRows] = await pool.query<(RowDataPacket & { oid: string | null })[]>(
    `SELECT oid FROM users WHERE id = ? LIMIT 1`,
    [returnedBy],
  );
  const returnedByName = await getDisplayNameByOid(techRows[0]?.oid ?? null);

  const [assetRows] = await pool.query<ReturnAssetRow[]>(
    `SELECT ra.assignment_id, ra.asset_id, ra.checkout_at, ra.returned_at, ra.return_condition,
            COALESCE(l.model, av.model) AS model,
            COALESCE(l.brand, av.brand) AS brand,
            COALESCE(l.serial_num, av.serial_num) AS serial_num,
            ri.asset_type,
            IF(l.asset_id IS NOT NULL, 'laptop', 'av') AS pool_kind
     FROM request_assignment ra
     LEFT JOIN request_item ri ON ri.request_item_id = ra.request_item_id
     LEFT JOIN laptop l ON l.asset_id = ra.asset_id
     LEFT JOIN av av ON av.asset_id = ra.asset_id
     WHERE ra.assignment_id IN (${placeholders})
       AND ra.request_id = ?
       AND ra.returned_at IS NOT NULL
       AND ra.asset_id IS NOT NULL
     ORDER BY ra.assignment_id`,
    [...assignmentIds, requestId],
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
      returnedAt: formatDateTime(r.returned_at),
      returnCondition: r.return_condition?.trim() || returnCondition,
    };
  });

  const latestReturn = assets.reduce(
    (latest, a) => (a.returnedAt > latest ? a.returnedAt : latest),
    assets[0].returnedAt,
  );

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
    returnedByName: returnedByName || returnedBy,
    returnedByStaffId: returnedBy,
    returnedAt: latestReturn,
    returnCondition: returnCondition.trim(),
    returnRemarks: returnRemarks?.trim() || null,
    assets,
  };
}
