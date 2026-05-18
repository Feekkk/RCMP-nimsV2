import type { RowDataPacket } from 'mysql2';
import type {
  ActiveForRequestAsset,
  AssignAssetToRequestInput,
  MarkAssetForRequestInput,
  PendingRequest,
  RequestAssignableKind,
  RequestAssignmentRow,
  RequestItemRow,
  RequestPoolAsset,
} from '@/lib/request-schema';
import { REQUEST_STATUS_ACTIVE } from '@/lib/request-schema';
import { STATUS_ID } from '@/lib/asset-status-actions';
import { getDbPool } from '@/server/db';

const ACTIVE_STATUS = STATUS_ID.ACTIVE;

function formatDate(val: Date | string | null | undefined): string {
  if (val == null) return '';
  if (val instanceof Date) return val.toISOString().slice(0, 10);
  return String(val).slice(0, 10);
}

function formatTs(val: Date | string | null | undefined): string | null {
  if (val == null) return null;
  if (val instanceof Date) return val.toISOString();
  return String(val);
}

type LaptopRow = RowDataPacket & {
  asset_id: number;
  model: string | null;
  brand: string | null;
  category: string | null;
  serial_num: string | null;
  status_id: number;
};

type AvRow = RowDataPacket & {
  asset_id: number;
  model: string | null;
  brand: string | null;
  category: string | null;
  serial_num: string | null;
  status_id: number;
};

async function queryLaptopActive(): Promise<ActiveForRequestAsset[]> {
  const pool = getDbPool();
  const [rows] = await pool.query<LaptopRow[]>(
    `SELECT asset_id, model, brand, category, serial_num, status_id
     FROM laptop WHERE status_id = ? ORDER BY asset_id`,
    [ACTIVE_STATUS],
  );
  return rows.map((r) => ({
    kind: 'laptop',
    assetId: r.asset_id,
    model: r.model,
    brand: r.brand,
    category: r.category,
    serialNum: r.serial_num,
    statusId: r.status_id,
  }));
}

async function queryAvActive(): Promise<ActiveForRequestAsset[]> {
  const pool = getDbPool();
  const [rows] = await pool.query<AvRow[]>(
    `SELECT asset_id, model, brand, category, serial_num, status_id
     FROM av WHERE status_id = ? ORDER BY asset_id`,
    [ACTIVE_STATUS],
  );
  return rows.map((r) => ({
    kind: 'av',
    assetId: r.asset_id,
    model: r.model,
    brand: r.brand,
    category: r.category,
    serialNum: r.serial_num,
    statusId: r.status_id,
  }));
}

type PoolRow = RowDataPacket & {
  asset_id: number;
  model: string | null;
  brand: string | null;
  category: string | null;
  serial_num: string | null;
  status_id: number;
  request_id: number | null;
  requester_name: string | null;
  assignment_id: number | null;
};

async function queryLaptopPool(): Promise<RequestPoolAsset[]> {
  const pool = getDbPool();
  const [rows] = await pool.query<PoolRow[]>(
    `SELECT l.asset_id, l.model, l.brand, l.category, l.serial_num, l.status_id,
            ra.request_id, u.full_name AS requester_name, ra.assignment_id
     FROM laptop l
     LEFT JOIN request_assignment ra
       ON ra.asset_id = l.asset_id AND ra.returned_at IS NULL
     LEFT JOIN request r ON r.request_id = ra.request_id AND r.rejected_at IS NULL
     LEFT JOIN users u ON u.staff_id = r.requested_by
     WHERE l.status_id = ?
     ORDER BY l.asset_id`,
    [REQUEST_STATUS_ACTIVE],
  );
  return rows.map((r) => ({
    kind: 'laptop',
    assetId: r.asset_id,
    model: r.model,
    brand: r.brand,
    category: r.category,
    serialNum: r.serial_num,
    statusId: r.status_id,
    requestId: r.request_id,
    requesterName: r.requester_name,
    assignmentId: r.assignment_id,
  }));
}

async function queryAvPool(): Promise<RequestPoolAsset[]> {
  const pool = getDbPool();
  const [rows] = await pool.query<PoolRow[]>(
    `SELECT a.asset_id, a.model, a.brand, a.category, a.serial_num, a.status_id,
            ra.request_id, u.full_name AS requester_name, ra.assignment_id
     FROM av a
     LEFT JOIN request_assignment ra
       ON ra.asset_id = a.asset_id AND ra.returned_at IS NULL
     LEFT JOIN request r ON r.request_id = ra.request_id AND r.rejected_at IS NULL
     LEFT JOIN users u ON u.staff_id = r.requested_by
     WHERE a.status_id = ?
     ORDER BY a.asset_id`,
    [REQUEST_STATUS_ACTIVE],
  );
  return rows.map((r) => ({
    kind: 'av',
    assetId: r.asset_id,
    model: r.model,
    brand: r.brand,
    category: r.category,
    serialNum: r.serial_num,
    statusId: r.status_id,
    requestId: r.request_id,
    requesterName: r.requester_name,
    assignmentId: r.assignment_id,
  }));
}

export async function listActiveForRequestPool(): Promise<ActiveForRequestAsset[]> {
  const [laptop, av] = await Promise.all([queryLaptopActive(), queryAvActive()]);
  return [...laptop, ...av];
}

export async function listRequestPoolAssets(): Promise<RequestPoolAsset[]> {
  const [laptop, av] = await Promise.all([queryLaptopPool(), queryAvPool()]);
  return [...laptop, ...av];
}

export async function listAvailablePoolAssets(): Promise<RequestPoolAsset[]> {
  const all = await listRequestPoolAssets();
  return all.filter((a) => a.assignmentId == null);
}

/** Status 9 assets with an open request_assignment */
export async function listAssignedRequestPoolAssets(): Promise<RequestPoolAsset[]> {
  const all = await listRequestPoolAssets();
  return all.filter((a) => a.assignmentId != null);
}

export async function markAssetForRequest(input: MarkAssetForRequestInput): Promise<void> {
  const pool = getDbPool();
  const table = input.kind === 'laptop' ? 'laptop' : 'av';

  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT status_id FROM \`${table}\` WHERE asset_id = ?`,
    [input.assetId],
  );
  const row = rows[0] as { status_id: number } | undefined;
  if (!row) throw new Error('Asset not found');
  if (row.status_id !== ACTIVE_STATUS) {
    throw new Error('Only active (status 1) assets can be added to the request pool');
  }

  const [openAssign] = await pool.query<RowDataPacket[]>(
    `SELECT assignment_id FROM request_assignment
     WHERE asset_id = ? AND returned_at IS NULL LIMIT 1`,
    [input.assetId],
  );
  if (openAssign[0]) {
    throw new Error('Asset is already assigned to an open request');
  }

  await pool.execute(`UPDATE \`${table}\` SET status_id = ? WHERE asset_id = ?`, [
    REQUEST_STATUS_ACTIVE,
    input.assetId,
  ]);
}

export async function markAssetsForRequest(
  assets: MarkAssetForRequestInput[],
): Promise<{ updated: number; errors: string[] }> {
  const errors: string[] = [];
  let updated = 0;
  for (const asset of assets) {
    try {
      await markAssetForRequest(asset);
      updated += 1;
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed';
      errors.push(`${asset.kind} #${asset.assetId}: ${msg}`);
    }
  }
  return { updated, errors };
}

async function assertAssetInPool(kind: RequestAssignableKind, assetId: number) {
  const pool = getDbPool();
  const table = kind === 'laptop' ? 'laptop' : 'av';
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT status_id FROM \`${table}\` WHERE asset_id = ?`,
    [assetId],
  );
  const row = rows[0] as { status_id: number } | undefined;
  if (!row) throw new Error('Asset not found');
  if (row.status_id !== REQUEST_STATUS_ACTIVE) {
    throw new Error('Asset must be in the request pool (status 9) before assigning to a user request');
  }
}

export async function assignPoolAssetToRequest(input: AssignAssetToRequestInput): Promise<void> {
  const pool = getDbPool();

  const [reqRows] = await pool.query<RowDataPacket[]>(
    `SELECT request_id FROM request WHERE request_id = ? AND rejected_at IS NULL`,
    [input.requestId],
  );
  if (!reqRows[0]) throw new Error('Request not found or was rejected');

  await assertAssetInPool(input.kind, input.assetId);

  const [existing] = await pool.query<RowDataPacket[]>(
    `SELECT assignment_id FROM request_assignment
     WHERE asset_id = ? AND returned_at IS NULL`,
    [input.assetId],
  );
  if (existing[0]) throw new Error('Asset is already assigned to another open request');

  const [dup] = await pool.query<RowDataPacket[]>(
    `SELECT assignment_id FROM request_assignment
     WHERE request_id = ? AND asset_id = ?`,
    [input.requestId, input.assetId],
  );
  if (dup[0]) throw new Error('This asset is already on this request');

  await pool.execute(
    `INSERT INTO request_assignment
      (request_id, request_item_id, asset_id, assigned_by, assigned_at, remarks)
     VALUES (?, ?, ?, ?, NOW(), ?)`,
    [
      input.requestId,
      input.requestItemId,
      input.assetId,
      input.assignedBy,
      input.remarks,
    ],
  );
}

type RequestHeaderRow = RowDataPacket & {
  request_id: number;
  requested_by: string;
  requester_name: string;
  borrow_date: Date | string;
  return_date: Date | string;
  program_type: string;
  usage_location: string;
  reason: string | null;
  created_at: Date | string;
};

export async function listPendingRequests(): Promise<PendingRequest[]> {
  const pool = getDbPool();
  const [headers] = await pool.query<RequestHeaderRow[]>(
    `SELECT r.request_id, r.requested_by, u.full_name AS requester_name,
            r.borrow_date, r.return_date, r.program_type, r.usage_location,
            r.reason, r.created_at
     FROM request r
     INNER JOIN users u ON u.staff_id = r.requested_by
     WHERE r.rejected_at IS NULL
     ORDER BY r.created_at DESC`,
  );

  const results: PendingRequest[] = [];

  for (const h of headers) {
    const [items] = await pool.query<
      (RowDataPacket & { request_item_id: number; asset_type: string; quantity: number })[]
    >(
      `SELECT request_item_id, asset_type, quantity FROM request_item WHERE request_id = ?`,
      [h.request_id],
    );

    const [assignments] = await pool.query<
      (RowDataPacket & {
        assignment_id: number;
        request_item_id: number | null;
        asset_id: number;
        assigned_at: Date | string | null;
        model: string | null;
        brand: string | null;
        kind: string;
      })[]
    >(
      `SELECT ra.assignment_id, ra.request_item_id, ra.asset_id, ra.assigned_at,
              COALESCE(l.model, av.model) AS model,
              COALESCE(l.brand, av.brand) AS brand,
              IF(l.asset_id IS NOT NULL, 'laptop', 'av') AS kind
       FROM request_assignment ra
       LEFT JOIN laptop l ON l.asset_id = ra.asset_id
       LEFT JOIN av av ON av.asset_id = ra.asset_id
       WHERE ra.request_id = ? AND ra.returned_at IS NULL`,
      [h.request_id],
    );

    const assignmentRows: RequestAssignmentRow[] = assignments.map((a) => ({
      assignmentId: a.assignment_id,
      requestItemId: a.request_item_id,
      assetId: a.asset_id,
      kind: a.kind === 'laptop' ? 'laptop' : 'av',
      model: a.model,
      brand: a.brand,
      assignedAt: formatTs(a.assigned_at),
    }));

    results.push({
      requestId: h.request_id,
      requestedBy: h.requested_by,
      requesterName: h.requester_name,
      borrowDate: formatDate(h.borrow_date),
      returnDate: formatDate(h.return_date),
      programType: h.program_type,
      usageLocation: h.usage_location,
      reason: h.reason,
      createdAt: formatTs(h.created_at) ?? '',
      items: items.map(
        (i): RequestItemRow => ({
          requestItemId: i.request_item_id,
          assetType: i.asset_type,
          quantity: i.quantity,
        }),
      ),
      assignments: assignmentRows,
    });
  }

  return results;
}
