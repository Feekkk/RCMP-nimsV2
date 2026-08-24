import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { AssetKind } from '@shared/lib/inventory-schema';
import { getDbPool } from '@backend/server/core/db';

type DbConnection = Awaited<ReturnType<ReturnType<typeof getDbPool>['getConnection']>>;

function parseStaffUserId(staffId: string): number {
  const userId = Number.parseInt(staffId.trim(), 10);
  if (!Number.isFinite(userId) || userId <= 0) {
    throw new Error('Your technician session could not be verified. Sign out and sign in again.');
  }
  return userId;
}

function assetIdValue(kind: AssetKind, assetId: number | string): string {
  return kind === 'laptop' ? String(assetId).trim() : String(assetId);
}

async function findActiveDisposalItemId(
  conn: DbConnection,
  kind: AssetKind,
  assetId: number | string,
): Promise<number | null> {
  const [rows] = await conn.query<(RowDataPacket & { disposal_item_id: number })[]>(
    `SELECT disposal_item_id
     FROM disposal_item
     WHERE asset_type = ? AND asset_id = ? AND removed_at IS NULL
     LIMIT 1`,
    [kind, assetIdValue(kind, assetId)],
  );
  return rows[0]?.disposal_item_id ?? null;
}

export async function recordAssetPredisposed(
  conn: DbConnection,
  input: { kind: AssetKind; assetId: number | string; staffId: string },
): Promise<void> {
  const userId = parseStaffUserId(input.staffId);
  const assetId = assetIdValue(input.kind, input.assetId);

  const existingItemId = await findActiveDisposalItemId(conn, input.kind, assetId);
  if (existingItemId != null) {
    throw new Error('This asset is already in the pre-disposed queue.');
  }

  const [disposalResult] = await conn.execute<ResultSetHeader>(
    `INSERT INTO disposal (requested_by) VALUES (?)`,
    [userId],
  );
  const disposalId = disposalResult.insertId;

  await conn.execute(
    `INSERT INTO disposal_item (disposal_id, asset_id, asset_type, predisposed_by)
     VALUES (?, ?, ?, ?)`,
    [disposalId, assetId, input.kind, userId],
  );
}

export async function recordAssetPredisposalRemoved(
  conn: DbConnection,
  input: { kind: AssetKind; assetId: number | string; staffId: string },
): Promise<void> {
  const userId = parseStaffUserId(input.staffId);

  await conn.execute(
    `UPDATE disposal_item
     SET removed_at = CURRENT_TIMESTAMP, removed_by = ?
     WHERE asset_type = ? AND asset_id = ? AND removed_at IS NULL`,
    [userId, input.kind, assetIdValue(input.kind, input.assetId)],
  );
}

export async function withAssetPredisposalTransaction<T>(
  fn: (conn: DbConnection) => Promise<T>,
): Promise<T> {
  const pool = getDbPool();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const result = await fn(conn);
    await conn.commit();
    return result;
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}
