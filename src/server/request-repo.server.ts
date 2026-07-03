import type { RowDataPacket } from 'mysql2';
import type {
  ActiveForRequestAsset,
  AssignAssetToRequestInput,
  MarkAssetForRequestInput,
  PendingRequest,
  RemoveAssetFromRequestPoolInput,
  RequestAssignableKind,
  RequestAssignmentRow,
  RequestItemRow,
  RequestPoolAsset,
  SubmitUserRequestInput,
  SubmitUserRequestResult,
  UserRequestHistory,
  UserRequestHistoryStatus,
  UserRequestItemProgress,
  RequestLogEntry,
  RequestLogAssignment,
} from '@/lib/request-schema';
import {
  REQUEST_STATUS_ACTIVE,
  REQUEST_STATUS_BOOKED,
  REQUEST_STATUS_CHECKOUT,
} from '@/lib/request-schema';
import { STATUS_ID } from '@/lib/asset-status-actions';
import type {
  ChangeBookedAssignmentInput,
  CheckoutRequestAssignmentInput,
  CheckoutUserRequestInput,
  CheckoutUserRequestResult,
  CancelBookedNotTakenInput,
  MarkRequestSlotNotTakenInput,
  MarkRequestSlotUnavailableInput,
  RejectUserRequestInput,
  RequestSlotMark,
  ReturnRequestAssignmentInput,
  ReturnUserRequestInput,
  ReturnUserRequestResult,
} from '@/lib/request-schema';
import { requestItemKindFromAssetType } from '@/lib/request-asset-types';
import { isUserProfileComplete } from '@/lib/user-profile';
import { attachDisplayNames, resolveAccountProfile } from '@/server/azure-directory.server';
import { getDbPool } from '@/server/db';

/** Source pool for marking an asset available to borrow (see status.md): freshly registered "new" assets. */
const ACTIVE_STATUS = STATUS_ID.NEW;

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
  asset_id_old: string | null;
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
    assetIdOld: null,
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
    `SELECT asset_id, asset_id_old, model, brand, category, serial_num, status_id
     FROM av WHERE status_id = ? ORDER BY asset_id`,
    [ACTIVE_STATUS],
  );
  return rows.map((r) => ({
    kind: 'av',
    assetId: r.asset_id,
    assetIdOld: r.asset_id_old,
    model: r.model,
    brand: r.brand,
    category: r.category,
    serialNum: r.serial_num,
    statusId: r.status_id,
  }));
}

type PoolRow = RowDataPacket & {
  asset_id: number;
  asset_id_old?: string | null;
  model: string | null;
  brand: string | null;
  category: string | null;
  serial_num: string | null;
  status_id: number;
  request_id: number | null;
  requester_oid: string | null;
  requester_name: string | null;
  assignment_id: number | null;
};

async function queryLaptopPool(): Promise<RequestPoolAsset[]> {
  const pool = getDbPool();
  const [rows] = await pool.query<PoolRow[]>(
    `SELECT l.asset_id, l.model, l.brand, l.category, l.serial_num, l.status_id,
            ra.request_id, u.oid AS requester_oid, ra.assignment_id
     FROM laptop l
     LEFT JOIN request_assignment ra
       ON ra.asset_id = l.asset_id AND ra.returned_at IS NULL
     LEFT JOIN request r ON r.request_id = ra.request_id AND r.rejected_at IS NULL
     LEFT JOIN users u ON u.id = r.requested_by
     WHERE l.status_id IN (?, ?, ?)
     ORDER BY l.asset_id`,
    [REQUEST_STATUS_ACTIVE, REQUEST_STATUS_BOOKED, REQUEST_STATUS_CHECKOUT],
  );
  await attachDisplayNames(rows, 'requester_oid', 'requester_name');
  return rows.map((r) => ({
    kind: 'laptop',
    assetId: r.asset_id,
    assetIdOld: null,
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
    `SELECT a.asset_id, a.asset_id_old, a.model, a.brand, a.category, a.serial_num, a.status_id,
            ra.request_id, u.oid AS requester_oid, ra.assignment_id
     FROM av a
     LEFT JOIN request_assignment ra
       ON ra.asset_id = a.asset_id AND ra.returned_at IS NULL
     LEFT JOIN request r ON r.request_id = ra.request_id AND r.rejected_at IS NULL
     LEFT JOIN users u ON u.id = r.requested_by
     WHERE a.status_id IN (?, ?, ?)
     ORDER BY a.asset_id`,
    [REQUEST_STATUS_ACTIVE, REQUEST_STATUS_BOOKED, REQUEST_STATUS_CHECKOUT],
  );
  await attachDisplayNames(rows, 'requester_oid', 'requester_name');
  return rows.map((r) => ({
    kind: 'av',
    assetId: r.asset_id,
    assetIdOld: r.asset_id_old ?? null,
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

/** Active-request (6) assets with an open request_assignment */
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
  if (!row) throw new Error('This asset could not be found. Refresh the page and check the asset ID.');
  if (row.status_id !== ACTIVE_STATUS) {
    throw new Error(
      'This asset is not available for requests — only new (unassigned) assets can be added. Check its status or choose a different asset.',
    );
  }

  const [openAssign] = await pool.query<RowDataPacket[]>(
    `SELECT assignment_id FROM request_assignment
     WHERE asset_id = ? AND returned_at IS NULL LIMIT 1`,
    [input.assetId],
  );
  if (openAssign[0]) {
    throw new Error(
      'This asset is already booked on another open request. Choose a different asset or wait until that request is closed.',
    );
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
      const msg = e instanceof Error ? e.message : 'This asset could not be added to the request pool.';
      errors.push(`${asset.kind} #${asset.assetId}: ${msg}`);
    }
  }
  return { updated, errors };
}

export async function removeAssetFromRequestPool(
  input: RemoveAssetFromRequestPoolInput,
): Promise<void> {
  const pool = getDbPool();
  const table = input.kind === 'laptop' ? 'laptop' : 'av';

  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT status_id FROM \`${table}\` WHERE asset_id = ?`,
    [input.assetId],
  );
  const row = rows[0] as { status_id: number } | undefined;
  if (!row) throw new Error('This asset could not be found. Refresh the page and check the asset ID.');
  if (row.status_id !== REQUEST_STATUS_ACTIVE) {
    throw new Error(
      'Only available request-pool assets can be removed. Booked or checked-out assets must be returned through the request workflow.',
    );
  }

  const [openAssign] = await pool.query<RowDataPacket[]>(
    `SELECT assignment_id FROM request_assignment
     WHERE asset_id = ? AND returned_at IS NULL LIMIT 1`,
    [input.assetId],
  );
  if (openAssign[0]) {
    throw new Error(
      'This asset is assigned to an open request and cannot be removed here. Release the booking from the request page first.',
    );
  }

  await pool.execute(`UPDATE \`${table}\` SET status_id = ? WHERE asset_id = ?`, [
    STATUS_ID.RETURN,
    input.assetId,
  ]);
}

async function assertAssetInPool(kind: RequestAssignableKind, assetId: number) {
  const pool = getDbPool();
  const table = kind === 'laptop' ? 'laptop' : 'av';
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT status_id FROM \`${table}\` WHERE asset_id = ?`,
    [assetId],
  );
  const row = rows[0] as { status_id: number } | undefined;
  if (!row) throw new Error('This asset could not be found. Refresh the page and check the asset ID.');
  if (row.status_id !== REQUEST_STATUS_ACTIVE) {
    throw new Error(
      'This asset has not been added to the request pool yet. Add it to the pool first, then assign it to a request.',
    );
  }
}

async function setAssetRequestStatus(
  kind: RequestAssignableKind,
  assetId: number,
  statusId: number,
  conn?: import('mysql2/promise').PoolConnection,
) {
  const table = kind === 'laptop' ? 'laptop' : 'av';
  const q = conn ?? getDbPool();
  await q.execute(`UPDATE \`${table}\` SET status_id = ? WHERE asset_id = ?`, [statusId, assetId]);
}

/** Book asset: pool (9) → assignment row + status 10 */
export async function bookPoolAssetToRequest(input: AssignAssetToRequestInput): Promise<number> {
  const pool = getDbPool();

  const [reqRows] = await pool.query<RowDataPacket[]>(
    `SELECT request_id FROM request WHERE request_id = ? AND rejected_at IS NULL`,
    [input.requestId],
  );
  if (!reqRows[0]) {
    throw new Error(
      'This request no longer exists or was rejected. Refresh the page and check the request list.',
    );
  }

  await assertAssetInPool(input.kind, input.assetId);

  const [existing] = await pool.query<RowDataPacket[]>(
    `SELECT assignment_id FROM request_assignment
     WHERE asset_id = ? AND returned_at IS NULL`,
    [input.assetId],
  );
  if (existing[0]) {
    throw new Error(
      'This asset is already booked on another open request. Choose a different asset or wait until that request is closed.',
    );
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [result] = await conn.execute(
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
    const assignmentId = (result as { insertId: number }).insertId;

    await setAssetRequestStatus(input.kind, input.assetId, REQUEST_STATUS_BOOKED, conn);

    await conn.commit();
    return assignmentId;
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

/** @deprecated Use bookPoolAssetToRequest */
export async function assignPoolAssetToRequest(input: AssignAssetToRequestInput): Promise<void> {
  await bookPoolAssetToRequest(input);
}

export async function changeBookedAssignment(input: ChangeBookedAssignmentInput): Promise<void> {
  const pool = getDbPool();
  const [rows] = await pool.query<
    (RowDataPacket & {
      request_id: number;
      asset_id: number;
      checkout_at: Date | string | null;
      rejected_at: Date | string | null;
      old_kind: string;
      old_status_id: number;
    })[]
  >(
    `SELECT ra.request_id, ra.asset_id, ra.checkout_at, r.rejected_at,
            IF(l.asset_id IS NOT NULL, 'laptop', 'av') AS old_kind,
            COALESCE(l.status_id, av.status_id) AS old_status_id
     FROM request_assignment ra
     INNER JOIN request r ON r.request_id = ra.request_id
     LEFT JOIN laptop l ON l.asset_id = ra.asset_id
     LEFT JOIN av av ON av.asset_id = ra.asset_id
     WHERE ra.assignment_id = ? AND ra.returned_at IS NULL`,
    [input.assignmentId],
  );
  const row = rows[0];
  if (!row) throw new Error('This booking could not be found. Refresh the page and try again.');
  if (row.rejected_at) {
    throw new Error(
      'This request was rejected, so this action cannot be completed. Open a different request instead.',
    );
  }
  if (row.checkout_at) {
    throw new Error(
      'This asset has already been checked out and cannot be swapped. Process a return first if you need to make changes.',
    );
  }
  if (row.old_status_id !== REQUEST_STATUS_BOOKED) {
    throw new Error(
      'Only assets that are booked but not yet checked out can be changed. Check the asset status first.',
    );
  }

  const oldKind: RequestAssignableKind = row.old_kind === 'laptop' ? 'laptop' : 'av';
  if (row.asset_id === input.assetId && oldKind === input.kind) {
    return;
  }

  await assertAssetInPool(input.kind, input.assetId);

  const [existing] = await pool.query<RowDataPacket[]>(
    `SELECT assignment_id FROM request_assignment
     WHERE asset_id = ? AND returned_at IS NULL AND assignment_id != ?`,
    [input.assetId, input.assignmentId],
  );
  if (existing[0]) {
    throw new Error(
      'This asset is already booked on another open request. Choose a different asset or wait until that request is closed.',
    );
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    await setAssetRequestStatus(oldKind, row.asset_id, REQUEST_STATUS_ACTIVE, conn);

    await conn.execute(
      `UPDATE request_assignment SET asset_id = ?, assigned_by = ?, assigned_at = NOW()
       WHERE assignment_id = ?`,
      [input.assetId, input.changedBy, input.assignmentId],
    );

    await setAssetRequestStatus(input.kind, input.assetId, REQUEST_STATUS_BOOKED, conn);

    await conn.commit();
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

function parseSlotMark(
  unavailableAt: Date | string | null,
  assetId: number | null,
  remarks: string | null,
): RequestSlotMark | null {
  if (unavailableAt == null || assetId != null) return null;
  return String(remarks ?? '').toLowerCase().includes('not taken') ? 'not_taken' : 'unavailable';
}

async function insertClosedRequestSlot(
  input: MarkRequestSlotUnavailableInput,
  remarks: string,
): Promise<number> {
  const pool = getDbPool();

  const [reqRows] = await pool.query<RowDataPacket[]>(
    `SELECT request_id FROM request WHERE request_id = ? AND rejected_at IS NULL`,
    [input.requestId],
  );
  if (!reqRows[0]) {
    throw new Error(
      'This request no longer exists or was rejected. Refresh the page and check the request list.',
    );
  }

  const [itemRows] = await pool.query<RowDataPacket[]>(
    `SELECT request_item_id FROM request_item WHERE request_item_id = ? AND request_id = ?`,
    [input.requestItemId, input.requestId],
  );
  if (!itemRows[0]) {
    throw new Error(
      'That equipment line could not be found on this request. Refresh the page and try again.',
    );
  }

  const [result] = await pool.execute(
    `INSERT INTO request_assignment
      (request_id, request_item_id, asset_id, assigned_by, assigned_at, unavailable_at, remarks)
     VALUES (?, ?, NULL, ?, NOW(), NOW(), ?)`,
    [input.requestId, input.requestItemId, input.markedBy, remarks],
  );
  return (result as { insertId: number }).insertId;
}

export async function markRequestSlotUnavailable(
  input: MarkRequestSlotUnavailableInput,
): Promise<number> {
  return insertClosedRequestSlot(input, input.remarks ?? 'Unavailable');
}

export async function markRequestSlotNotTaken(
  input: MarkRequestSlotNotTakenInput,
): Promise<number> {
  return insertClosedRequestSlot(input, 'Not taken');
}

/** Booked asset was not collected by the requester — release back to the request pool. */
export async function cancelBookedAssignmentNotTaken(
  input: CancelBookedNotTakenInput,
): Promise<void> {
  const pool = getDbPool();
  const [rows] = await pool.query<
    (RowDataPacket & {
      asset_id: number;
      checkout_at: Date | string | null;
      rejected_at: Date | string | null;
      kind: string;
      status_id: number;
    })[]
  >(
    `SELECT ra.asset_id, ra.checkout_at, r.rejected_at,
            IF(l.asset_id IS NOT NULL, 'laptop', 'av') AS kind,
            COALESCE(l.status_id, av.status_id) AS status_id
     FROM request_assignment ra
     INNER JOIN request r ON r.request_id = ra.request_id
     LEFT JOIN laptop l ON l.asset_id = ra.asset_id
     LEFT JOIN av av ON av.asset_id = ra.asset_id
     WHERE ra.assignment_id = ? AND ra.returned_at IS NULL`,
    [input.assignmentId],
  );
  const row = rows[0];
  if (!row) throw new Error('This booking could not be found. Refresh the page and try again.');
  if (row.rejected_at) {
    throw new Error(
      'This request was rejected, so this action cannot be completed. Open a different request instead.',
    );
  }
  if (row.checkout_at) {
    throw new Error('This asset has already been checked out.');
  }
  if (row.status_id !== REQUEST_STATUS_BOOKED) {
    throw new Error(
      'Only booked assets that have not been collected can be marked as not taken.',
    );
  }

  const kind: RequestAssignableKind = row.kind === 'laptop' ? 'laptop' : 'av';
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.execute(
      `UPDATE request_assignment
       SET returned_at = NOW(), return_condition = 'Not taken', returned_by = ?, remarks = 'Not taken'
       WHERE assignment_id = ?`,
      [input.cancelledBy, input.assignmentId],
    );
    await setAssetRequestStatus(kind, row.asset_id, REQUEST_STATUS_ACTIVE, conn);
    await conn.commit();
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

export async function checkoutUserRequest(
  input: CheckoutUserRequestInput,
): Promise<CheckoutUserRequestResult> {
  const pool = getDbPool();
  const [rows] = await pool.query<(RowDataPacket & { assignment_id: number })[]>(
    `SELECT ra.assignment_id
     FROM request_assignment ra
     INNER JOIN request r ON r.request_id = ra.request_id
     LEFT JOIN laptop l ON l.asset_id = ra.asset_id
     LEFT JOIN av av ON av.asset_id = ra.asset_id
     WHERE ra.request_id = ?
       AND r.rejected_at IS NULL
       AND ra.returned_at IS NULL
       AND ra.unavailable_at IS NULL
       AND ra.asset_id IS NOT NULL
       AND ra.checkout_at IS NULL
       AND COALESCE(l.status_id, av.status_id) = ?`,
    [input.requestId, REQUEST_STATUS_BOOKED],
  );

  const assignmentIds: number[] = [];
  for (const row of rows) {
    await checkoutRequestAssignment({
      assignmentId: row.assignment_id,
      checkedOutBy: input.checkedOutBy,
    });
    assignmentIds.push(row.assignment_id);
  }
  if (assignmentIds.length === 0) {
    throw new Error(
      'There are no booked assets ready for checkout on this request. Book assets first, then try checkout again.',
    );
  }
  return { checkedOut: assignmentIds.length, assignmentIds };
}

export async function checkoutRequestAssignment(
  input: CheckoutRequestAssignmentInput,
): Promise<void> {
  const pool = getDbPool();
  const [rows] = await pool.query<
    (RowDataPacket & {
      request_id: number;
      asset_id: number;
      checkout_at: Date | string | null;
      rejected_at: Date | string | null;
      kind: string;
      status_id: number;
    })[]
  >(
    `SELECT ra.request_id, ra.asset_id, ra.checkout_at, r.rejected_at,
            IF(l.asset_id IS NOT NULL, 'laptop', 'av') AS kind,
            COALESCE(l.status_id, av.status_id) AS status_id
     FROM request_assignment ra
     INNER JOIN request r ON r.request_id = ra.request_id
     LEFT JOIN laptop l ON l.asset_id = ra.asset_id
     LEFT JOIN av av ON av.asset_id = ra.asset_id
     WHERE ra.assignment_id = ? AND ra.returned_at IS NULL`,
    [input.assignmentId],
  );
  const row = rows[0];
  if (!row) throw new Error('This booking could not be found. Refresh the page and try again.');
  if (row.rejected_at) {
    throw new Error(
      'This request was rejected, so this action cannot be completed. Open a different request instead.',
    );
  }
  if (row.checkout_at) {
    throw new Error('This asset has already been checked out.');
  }
  if (row.status_id !== REQUEST_STATUS_BOOKED) {
    throw new Error(
      'This asset must be booked before checkout. Complete the booking step first.',
    );
  }

  const kind: RequestAssignableKind = row.kind === 'laptop' ? 'laptop' : 'av';
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.execute(
      `UPDATE request_assignment SET checkout_at = NOW() WHERE assignment_id = ?`,
      [input.assignmentId],
    );
    await setAssetRequestStatus(kind, row.asset_id, REQUEST_STATUS_CHECKOUT, conn);
    await conn.commit();
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

async function returnOneAssignment(
  conn: import('mysql2/promise').PoolConnection,
  assignmentId: number,
  input: { returnedBy: string; returnCondition: string; remarks?: string | null },
): Promise<void> {
  const [rows] = await conn.query<
    (RowDataPacket & {
      asset_id: number;
      checkout_at: Date | string | null;
      returned_at: Date | string | null;
      rejected_at: Date | string | null;
      kind: string;
      status_id: number;
    })[]
  >(
    `SELECT ra.asset_id, ra.checkout_at, ra.returned_at, r.rejected_at,
            IF(l.asset_id IS NOT NULL, 'laptop', 'av') AS kind,
            COALESCE(l.status_id, av.status_id) AS status_id
     FROM request_assignment ra
     INNER JOIN request r ON r.request_id = ra.request_id
     LEFT JOIN laptop l ON l.asset_id = ra.asset_id
     LEFT JOIN av av ON av.asset_id = ra.asset_id
     WHERE ra.assignment_id = ?`,
    [assignmentId],
  );
  const row = rows[0];
  if (!row) throw new Error('This booking could not be found. Refresh the page and try again.');
  if (row.rejected_at) {
    throw new Error(
      'This request was rejected, so this action cannot be completed. Open a different request instead.',
    );
  }
  if (row.returned_at) throw new Error('This asset has already been returned.');
  if (!row.checkout_at) {
    throw new Error('This asset has not been checked out yet. Complete checkout before processing a return.');
  }
  if (row.status_id !== REQUEST_STATUS_CHECKOUT) {
    throw new Error(
      'This asset is not in checked-out status. Verify that checkout was completed before processing a return.',
    );
  }

  const kind: RequestAssignableKind = row.kind === 'laptop' ? 'laptop' : 'av';
  await conn.execute(
    `UPDATE request_assignment
     SET returned_at = NOW(),
         return_condition = ?,
         returned_by = ?,
         remarks = COALESCE(?, remarks)
     WHERE assignment_id = ?`,
    [input.returnCondition, input.returnedBy, input.remarks?.trim() || null, assignmentId],
  );
  await setAssetRequestStatus(kind, row.asset_id, REQUEST_STATUS_ACTIVE, conn);
}

export async function returnRequestAssignment(
  input: ReturnRequestAssignmentInput,
): Promise<void> {
  const condition = input.returnCondition.trim();
  if (!condition) {
    throw new Error(
      'A return condition is required. Select or describe the condition of the returned equipment.',
    );
  }

  const pool = getDbPool();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await returnOneAssignment(conn, input.assignmentId, {
      returnedBy: input.returnedBy,
      returnCondition: condition,
      remarks: input.remarks,
    });
    await conn.commit();
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

export async function returnUserRequest(
  input: ReturnUserRequestInput,
): Promise<ReturnUserRequestResult> {
  const condition = input.returnCondition.trim();
  if (!condition) {
    throw new Error(
      'A return condition is required. Select or describe the condition of the returned equipment.',
    );
  }

  const pool = getDbPool();
  const [pending] = await pool.query<RowDataPacket[]>(
    `SELECT assignment_id FROM request_assignment ra
     INNER JOIN request r ON r.request_id = ra.request_id
     WHERE ra.request_id = ? AND ra.checkout_at IS NOT NULL AND ra.returned_at IS NULL
       AND r.rejected_at IS NULL`,
    [input.requestId],
  );
  if (pending.length === 0) {
    throw new Error(
      'There are no checked-out assets on this request to return. Verify that checkout was completed.',
    );
  }

  const assignmentIds = pending.map((row) => Number(row.assignment_id));

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    for (const assignmentId of assignmentIds) {
      await returnOneAssignment(conn, assignmentId, {
        returnedBy: input.returnedBy,
        returnCondition: condition,
        remarks: input.remarks,
      });
    }
    await conn.commit();
    return { returned: assignmentIds.length, assignmentIds };
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

function requestNeedsTechnicianWork(
  items: RequestItemRow[],
  openAssignmentCount: number,
  returnedByItem: Map<number, number>,
): boolean {
  if (openAssignmentCount > 0) return true;
  return items.some((item) => {
    const returned = returnedByItem.get(item.requestItemId) ?? 0;
    return returned < item.quantity;
  });
}

export async function rejectUserRequest(input: RejectUserRequestInput): Promise<void> {
  const reason = input.rejectionReason.trim();
  if (!reason) {
    throw new Error(
      'Rejection notes are required. Enter a brief reason so the requester knows why the request was declined.',
    );
  }

  const pool = getDbPool();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [reqRows] = await conn.query<RowDataPacket[]>(
      `SELECT request_id FROM request WHERE request_id = ? AND rejected_at IS NULL`,
      [input.requestId],
    );
    if (!reqRows[0]) {
      throw new Error(
        'This request could not be found or was already rejected. Refresh the page and check the request list.',
      );
    }

    await conn.execute(
      `UPDATE request SET rejected_at = NOW(), rejected_by = ?, rejection_reason = ?
       WHERE request_id = ?`,
      [input.rejectedBy, reason, input.requestId],
    );

    await conn.execute(
      `UPDATE laptop l
       INNER JOIN request_assignment ra ON ra.asset_id = l.asset_id
       SET l.status_id = ?
       WHERE ra.request_id = ? AND ra.returned_at IS NULL AND l.status_id = ?`,
      [REQUEST_STATUS_ACTIVE, input.requestId, REQUEST_STATUS_BOOKED],
    );
    await conn.execute(
      `UPDATE av a
       INNER JOIN request_assignment ra ON ra.asset_id = a.asset_id
       SET a.status_id = ?
       WHERE ra.request_id = ? AND ra.returned_at IS NULL AND a.status_id = ?`,
      [REQUEST_STATUS_ACTIVE, input.requestId, REQUEST_STATUS_BOOKED],
    );

    await conn.commit();
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

type RequestHeaderRow = RowDataPacket & {
  request_id: number;
  requested_by: string;
  requester_oid: string | null;
  requester_name: string;
  borrow_date: Date | string;
  return_date: Date | string;
  program_type: string;
  usage_location: string;
  remarks: string | null;
  created_at: Date | string;
};

export async function listPendingRequests(): Promise<PendingRequest[]> {
  const pool = getDbPool();
  const [headers] = await pool.query<RequestHeaderRow[]>(
    `SELECT r.request_id, r.requested_by, u.oid AS requester_oid,
            r.borrow_date, r.return_date, r.program_type, r.usage_location,
            r.remarks, r.created_at
     FROM request r
     INNER JOIN users u ON u.id = r.requested_by
     WHERE r.rejected_at IS NULL
     ORDER BY r.created_at DESC`,
  );
  await attachDisplayNames(headers, 'requester_oid', 'requester_name');

  const results: PendingRequest[] = [];

  for (const h of headers) {
    const [items] = await pool.query<
      (RowDataPacket & { request_item_id: number; asset_type: string; quantity: number })[]
    >(
      `SELECT request_item_id, asset_type, quantity FROM request_item WHERE request_id = ?`,
      [h.request_id],
    );

    const [returnedRows] = await pool.query<
      (RowDataPacket & { request_item_id: number; cnt: number })[]
    >(
      `SELECT request_item_id, COUNT(*) AS cnt
       FROM request_assignment
       WHERE request_id = ? AND returned_at IS NOT NULL AND request_item_id IS NOT NULL
       GROUP BY request_item_id`,
      [h.request_id],
    );
    const returnedByItem = new Map<number, number>(
      returnedRows.map((r) => [r.request_item_id, Number(r.cnt)]),
    );

    const itemRows: RequestItemRow[] = items.map((i) => ({
      requestItemId: i.request_item_id,
      assetType: i.asset_type,
      quantity: i.quantity,
      returnedCount: returnedByItem.get(i.request_item_id) ?? 0,
    }));

    const [assignments] = await pool.query<
      (RowDataPacket & {
        assignment_id: number;
        request_item_id: number | null;
        asset_id: number | null;
        unavailable_at: Date | string | null;
        assigned_at: Date | string | null;
        checkout_at: Date | string | null;
        remarks: string | null;
        model: string | null;
        brand: string | null;
        asset_type: string | null;
        pool_kind: string | null;
        asset_status_id: number | null;
      })[]
    >(
      `SELECT ra.assignment_id, ra.request_item_id, ra.asset_id, ra.unavailable_at,
              ra.assigned_at, ra.checkout_at, ra.remarks,
              COALESCE(l.model, av.model) AS model,
              COALESCE(l.brand, av.brand) AS brand,
              ri.asset_type,
              IF(l.asset_id IS NOT NULL, 'laptop', IF(av.asset_id IS NOT NULL, 'av', NULL)) AS pool_kind,
              COALESCE(l.status_id, av.status_id) AS asset_status_id
       FROM request_assignment ra
       LEFT JOIN request_item ri ON ri.request_item_id = ra.request_item_id
       LEFT JOIN laptop l ON l.asset_id = ra.asset_id
       LEFT JOIN av av ON av.asset_id = ra.asset_id
       WHERE ra.request_id = ? AND ra.returned_at IS NULL`,
      [h.request_id],
    );

    const assignmentRows: RequestAssignmentRow[] = assignments.map((a) => {
      const slotMark = parseSlotMark(a.unavailable_at, a.asset_id, a.remarks);
      const unavailable = slotMark != null;
      const kind: RequestAssignableKind =
        a.pool_kind === 'laptop'
          ? 'laptop'
          : a.pool_kind === 'av'
            ? 'av'
            : requestItemKindFromAssetType(a.asset_type ?? 'av');

      return {
        assignmentId: a.assignment_id,
        requestItemId: a.request_item_id,
        assetId: a.asset_id,
        kind,
        model: a.model,
        brand: a.brand,
        assignedAt: formatTs(a.assigned_at),
        checkoutAt: formatTs(a.checkout_at),
        assetStatusId: unavailable ? 0 : (a.asset_status_id ?? 0),
        unavailable,
        slotMark,
      };
    });

    if (!requestNeedsTechnicianWork(itemRows, assignmentRows.length, returnedByItem)) {
      continue;
    }

    results.push({
      requestId: h.request_id,
      requestedBy: h.requested_by,
      requesterName: h.requester_name,
      borrowDate: formatDate(h.borrow_date),
      returnDate: formatDate(h.return_date),
      programType: h.program_type,
      usageLocation: h.usage_location,
      remarks: h.remarks,
      createdAt: formatTs(h.created_at) ?? '',
      items: itemRows,
      assignments: assignmentRows,
    });
  }

  return results;
}

function assignmentMatchesItem(
  a: { request_item_id: number | null; kind: string },
  item: { request_item_id: number; asset_type: string },
): boolean {
  if (a.request_item_id === item.request_item_id) return true;
  if (a.request_item_id != null) return false;
  return a.kind === requestItemKindFromAssetType(item.asset_type);
}

function isAssignmentNotTaken(remarks: string | null, returnCondition: string | null): boolean {
  const text = `${remarks ?? ''} ${returnCondition ?? ''}`.toLowerCase();
  return text.includes('not taken');
}

function buildUserItemProgress(
  items: { request_item_id: number; asset_type: string; quantity: number }[],
  assignments: {
    request_item_id: number | null;
    kind: string;
    asset_id: number | null;
    checkout_at: Date | string | null;
    returned_at: Date | string | null;
    unavailable_at: Date | string | null;
    remarks: string | null;
    return_condition: string | null;
  }[],
): UserRequestItemProgress[] {
  return items.map((item) => {
    const linked = assignments.filter((a) => assignmentMatchesItem(a, item));
    let bookedCount = 0;
    let checkedOutCount = 0;
    let returnedCount = 0;
    let unavailableCount = 0;
    let notTakenCount = 0;

    for (const a of linked) {
      const slotMark = parseSlotMark(a.unavailable_at, a.asset_id, a.remarks);
      if (slotMark === 'unavailable') {
        unavailableCount += 1;
        continue;
      }
      if (slotMark === 'not_taken') {
        notTakenCount += 1;
        continue;
      }
      if (a.returned_at != null) {
        if (isAssignmentNotTaken(a.remarks, a.return_condition)) {
          notTakenCount += 1;
        } else {
          returnedCount += 1;
        }
        continue;
      }
      if (a.checkout_at != null) {
        checkedOutCount += 1;
        continue;
      }
      if (a.asset_id != null) {
        bookedCount += 1;
      }
    }

    return {
      requestItemId: item.request_item_id,
      assetType: item.asset_type,
      quantity: item.quantity,
      bookedCount,
      checkedOutCount,
      returnedCount,
      unavailableCount,
      notTakenCount,
    };
  });
}

function deriveUserRequestStatus(
  rejectedAt: Date | string | null,
  items: UserRequestItemProgress[],
): UserRequestHistoryStatus {
  if (rejectedAt) return 'rejected';

  const totalQty = items.reduce((n, i) => n + i.quantity, 0);
  const totalReturned = items.reduce((n, i) => n + i.returnedCount, 0);
  const anyCheckedOut = items.some((i) => i.checkedOutCount > 0);
  const anyBooked = items.some((i) => i.bookedCount > 0);

  const resolvedUnits = (item: UserRequestItemProgress) =>
    item.returnedCount +
    item.unavailableCount +
    item.notTakenCount +
    item.checkedOutCount +
    item.bookedCount;

  const allResolved = totalQty > 0 && items.every((item) => resolvedUnits(item) >= item.quantity);

  if (anyCheckedOut) return 'in_use';
  if (anyBooked) return 'preparing';

  if (allResolved || totalReturned >= totalQty) {
    const nothingIssued = items.every(
      (item) => item.returnedCount === 0 && item.checkedOutCount === 0 && item.bookedCount === 0,
    );
    if (nothingIssued && items.some((item) => item.unavailableCount + item.notTakenCount > 0)) {
      return 'unavailable';
    }
    return 'completed';
  }

  return 'submitted';
}

export async function listUserRequestHistory(staffId: string): Promise<UserRequestHistory[]> {
  const pool = getDbPool();
  const [headers] = await pool.query<
    (RowDataPacket & {
      request_id: number;
      borrow_date: Date | string;
      return_date: Date | string;
      program_type: string;
      usage_location: string;
      remarks: string | null;
      created_at: Date | string;
      rejected_at: Date | string | null;
      rejection_reason: string | null;
    })[]
  >(
    `SELECT request_id, borrow_date, return_date, program_type, usage_location,
            remarks, created_at, rejected_at, rejection_reason
     FROM request
     WHERE requested_by = ?
     ORDER BY created_at DESC`,
    [staffId],
  );

  const results: UserRequestHistory[] = [];

  for (const h of headers) {
    const [items] = await pool.query<
      (RowDataPacket & { request_item_id: number; asset_type: string; quantity: number })[]
    >(
      `SELECT request_item_id, asset_type, quantity FROM request_item WHERE request_id = ?`,
      [h.request_id],
    );

    const [assignments] = await pool.query<
      (RowDataPacket & {
        request_item_id: number | null;
        kind: string;
        asset_id: number | null;
        checkout_at: Date | string | null;
        returned_at: Date | string | null;
        unavailable_at: Date | string | null;
        remarks: string | null;
        return_condition: string | null;
      })[]
    >(
      `SELECT ra.request_item_id, ra.asset_id,
              IF(l.asset_id IS NOT NULL, 'laptop', 'av') AS kind,
              ra.checkout_at, ra.returned_at, ra.unavailable_at, ra.remarks, ra.return_condition
       FROM request_assignment ra
       LEFT JOIN laptop l ON l.asset_id = ra.asset_id
       LEFT JOIN av av ON av.asset_id = ra.asset_id
       WHERE ra.request_id = ?`,
      [h.request_id],
    );

    const itemProgress = buildUserItemProgress(items, assignments);

    results.push({
      requestId: h.request_id,
      borrowDate: formatDate(h.borrow_date),
      returnDate: formatDate(h.return_date),
      programType: h.program_type,
      usageLocation: h.usage_location,
      remarks: h.remarks,
      createdAt: formatTs(h.created_at) ?? '',
      status: deriveUserRequestStatus(h.rejected_at, itemProgress),
      rejectionReason: h.rejection_reason,
      items: itemProgress,
    });
  }

  return results;
}

export async function listRequestLog(): Promise<RequestLogEntry[]> {
  const pool = getDbPool();
  const [headers] = await pool.query<
    (RowDataPacket & {
      request_id: number;
      requested_by: string;
      requester_oid: string | null;
      requester_name: string;
      borrow_date: Date | string;
      return_date: Date | string;
      program_type: string;
      usage_location: string;
      remarks: string | null;
      created_at: Date | string;
      rejected_at: Date | string | null;
      rejection_reason: string | null;
    })[]
  >(
    `SELECT r.request_id, r.requested_by, u.oid AS requester_oid,
            r.borrow_date, r.return_date, r.program_type, r.usage_location,
            r.remarks, r.created_at, r.rejected_at, r.rejection_reason
     FROM request r
     INNER JOIN users u ON u.id = r.requested_by
     ORDER BY r.created_at DESC`,
  );
  await attachDisplayNames(headers, 'requester_oid', 'requester_name');

  const results: RequestLogEntry[] = [];

  for (const h of headers) {
    const [items] = await pool.query<
      (RowDataPacket & { request_item_id: number; asset_type: string; quantity: number })[]
    >(
      `SELECT request_item_id, asset_type, quantity FROM request_item WHERE request_id = ?`,
      [h.request_id],
    );

    const itemById = new Map(items.map((i) => [i.request_item_id, i.asset_type]));

    const [assignments] = await pool.query<
      (RowDataPacket & {
        assignment_id: number;
        request_item_id: number | null;
        asset_id: number;
        assigned_at: Date | string | null;
        checkout_at: Date | string | null;
        returned_at: Date | string | null;
        return_condition: string | null;
        model: string | null;
        brand: string | null;
        kind: string;
        asset_status_id: number;
      })[]
    >(
      `SELECT ra.assignment_id, ra.request_item_id, ra.asset_id, ra.assigned_at,
              ra.checkout_at, ra.returned_at, ra.return_condition,
              COALESCE(l.model, av.model) AS model,
              COALESCE(l.brand, av.brand) AS brand,
              IF(l.asset_id IS NOT NULL, 'laptop', 'av') AS kind,
              COALESCE(l.status_id, av.status_id) AS asset_status_id
       FROM request_assignment ra
       LEFT JOIN laptop l ON l.asset_id = ra.asset_id
       LEFT JOIN av av ON av.asset_id = ra.asset_id
       WHERE ra.request_id = ?
       ORDER BY ra.assignment_id ASC`,
      [h.request_id],
    );

    const assignmentRows: RequestLogAssignment[] = assignments.map((a) => ({
      assignmentId: a.assignment_id,
      requestItemId: a.request_item_id,
      assetType: a.request_item_id != null ? itemById.get(a.request_item_id) ?? null : null,
      kind: a.kind === 'laptop' ? 'laptop' : 'av',
      assetId: a.asset_id,
      model: a.model,
      brand: a.brand,
      assignedAt: formatTs(a.assigned_at),
      checkoutAt: formatTs(a.checkout_at),
      returnedAt: formatTs(a.returned_at),
      returnCondition: a.return_condition,
      assetStatusId: a.asset_status_id,
    }));

    const [returnedRows] = await pool.query<
      (RowDataPacket & { request_item_id: number; cnt: number })[]
    >(
      `SELECT request_item_id, COUNT(*) AS cnt
       FROM request_assignment
       WHERE request_id = ? AND returned_at IS NOT NULL AND request_item_id IS NOT NULL
       GROUP BY request_item_id`,
      [h.request_id],
    );
    const returnedByItem = new Map(
      returnedRows.map((r) => [r.request_item_id, Number(r.cnt)]),
    );

    results.push({
      requestId: h.request_id,
      requesterName: h.requester_name,
      requestedBy: h.requested_by,
      borrowDate: formatDate(h.borrow_date),
      returnDate: formatDate(h.return_date),
      programType: h.program_type,
      usageLocation: h.usage_location,
      remarks: h.remarks,
      createdAt: formatTs(h.created_at) ?? '',
      rejectedAt: formatTs(h.rejected_at),
      rejectionReason: h.rejection_reason,
      items: items.map((i) => ({
        requestItemId: i.request_item_id,
        assetType: i.asset_type,
        quantity: i.quantity,
        returnedCount: returnedByItem.get(i.request_item_id) ?? 0,
      })),
      assignments: assignmentRows,
    });
  }

  return results;
}

export async function submitUserRequest(
  input: SubmitUserRequestInput,
): Promise<SubmitUserRequestResult> {
  if (!input.termsAcceptedAt) {
    throw new Error('The terms have not been accepted yet. Review and accept the terms, then submit again.');
  }
  if (!input.borrowDate || !input.returnDate) {
    throw new Error(
      'Borrow and return dates are both required. Select when you need the equipment and when you will return it.',
    );
  }
  if (input.returnDate < input.borrowDate) {
    throw new Error(
      'The return date is before the borrow date. Choose a return date on or after the borrow date.',
    );
  }
  if (!input.programType.trim() || !input.usageLocation.trim()) {
    throw new Error(
      'Program type and usage location are both required. Fill in both fields before submitting.',
    );
  }
  if (input.items.length === 0) {
    throw new Error('At least one equipment type is required. Add an item to your request before submitting.');
  }

  const pool = getDbPool();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [userRows] = await conn.query<
      (RowDataPacket & { oid: string | null; email: string; phone: string | null })[]
    >(
      `SELECT oid, email, phone FROM users WHERE id = ?`,
      [input.requestedBy],
    );
    const userRow = userRows[0];
    if (!userRow) {
      throw new Error('Your account could not be found. Sign out and sign in again.');
    }
    const profile = await resolveAccountProfile(userRow.oid, {
      email: userRow.email,
      phone: userRow.phone,
    });
    if (!isUserProfileComplete(profile)) {
      throw new Error(
        'Your profile is incomplete. Add your name, email, and phone number in your profile, then submit the request.',
      );
    }

    const [result] = await conn.execute(
      `INSERT INTO request
        (requested_by, borrow_date, return_date, program_type, usage_location, remarks, terms_accepted_at)
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [
        input.requestedBy,
        input.borrowDate,
        input.returnDate,
        input.programType.trim(),
        input.usageLocation.trim(),
        input.remarks?.trim() || null,
      ],
    );
    const requestId = (result as { insertId: number }).insertId;

    for (const item of input.items) {
      const qty = Math.max(1, Math.floor(item.quantity));
      await conn.execute(
        `INSERT INTO request_item (request_id, asset_type, quantity) VALUES (?, ?, ?)`,
        [requestId, item.assetType.trim(), qty],
      );
    }

    await conn.commit();
    return { requestId };
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}
