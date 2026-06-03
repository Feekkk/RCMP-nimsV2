import type { RowDataPacket } from 'mysql2';
import type { CheckoutEmailData } from '@/lib/checkout-email-types';
import { getRequestEmailData } from '@/server/request-email-repo.server';
import { getDbPool } from '@/server/db';

type CheckoutAssetRow = RowDataPacket & {
  assignment_id: number;
  asset_id: number;
  checkout_at: Date | string;
  model: string | null;
  brand: string | null;
  serial_num: string | null;
  category: string | null;
  asset_type: string | null;
  pool_kind: string | null;
};

function formatDateTime(val: Date | string | null): string {
  if (val == null) return '—';
  if (val instanceof Date) return val.toISOString().replace('T', ' ').slice(0, 19);
  const s = String(val);
  return s.includes('T') ? s.replace('T', ' ').slice(0, 19) : s.slice(0, 19);
}

export async function getCheckoutEmailData(
  requestId: number,
  checkedOutBy: string,
  assignmentIds: number[],
): Promise<CheckoutEmailData | null> {
  if (assignmentIds.length === 0) return null;

  const base = await getRequestEmailData(requestId);
  if (!base) return null;

  const pool = getDbPool();
  const placeholders = assignmentIds.map(() => '?').join(', ');

  const [techRows] = await pool.query<(RowDataPacket & { full_name: string | null })[]>(
    `SELECT full_name FROM users WHERE staff_id = ? LIMIT 1`,
    [checkedOutBy],
  );

  const [assetRows] = await pool.query<CheckoutAssetRow[]>(
    `SELECT ra.assignment_id, ra.asset_id, ra.checkout_at,
            COALESCE(l.model, av.model) AS model,
            COALESCE(l.brand, av.brand) AS brand,
            COALESCE(l.serial_num, av.serial_num) AS serial_num,
            COALESCE(l.category, av.category) AS category,
            ri.asset_type,
            IF(l.asset_id IS NOT NULL, 'laptop', 'av') AS pool_kind
     FROM request_assignment ra
     LEFT JOIN request_item ri ON ri.request_item_id = ra.request_item_id
     LEFT JOIN laptop l ON l.asset_id = ra.asset_id
     LEFT JOIN av av ON av.asset_id = ra.asset_id
     WHERE ra.assignment_id IN (${placeholders})
       AND ra.request_id = ?
       AND ra.checkout_at IS NOT NULL
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
      category: r.category?.trim() || '—',
      checkoutAt: formatDateTime(r.checkout_at),
    };
  });

  const latestCheckout = assets.reduce((latest, a) => (a.checkoutAt > latest ? a.checkoutAt : latest), assets[0].checkoutAt);

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
    reason: base.reason,
    submittedAt: base.submittedAt,
    requestedItems: base.items,
    checkedOutByName: techRows[0]?.full_name?.trim() || checkedOutBy,
    checkedOutByStaffId: checkedOutBy,
    checkedOutAt: latestCheckout,
    assets,
  };
}
