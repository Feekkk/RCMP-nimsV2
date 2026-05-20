import type { RowDataPacket, ResultSetHeader } from 'mysql2';
import type { AssetKind } from '@/lib/inventory-schema';
import { STATUS_ID } from '@/lib/asset-status-actions';
import {
  DISPOSAL_ELIGIBLE_STATUS_IDS,
  disposalAssetType,
  type CreateDisposalInput,
  type CreateDisposalResult,
} from '@/lib/disposal-schema';
import { getDbPool } from '@/server/db';

const TABLE_BY_KIND: Record<AssetKind, string> = {
  laptop: 'laptop',
  av: 'av',
  network: 'network',
};

const DISPOSED_STATUS = STATUS_ID.DISPOSED;

async function getAssetStatus(kind: AssetKind, assetId: number): Promise<number | null> {
  const pool = getDbPool();
  const table = TABLE_BY_KIND[kind];
  const [rows] = await pool.query<(RowDataPacket & { status_id: number })[]>(
    `SELECT status_id FROM \`${table}\` WHERE asset_id = ?`,
    [assetId],
  );
  return rows[0]?.status_id ?? null;
}

export async function createDisposal(input: CreateDisposalInput): Promise<CreateDisposalResult> {
  if (!input.requestedBy.trim()) {
    throw new Error('Technician staff ID is required');
  }
  if (!input.disposalDate.trim()) {
    throw new Error('Disposal date is required');
  }
  if (input.assets.length === 0) {
    throw new Error('Select at least one asset');
  }

  const seen = new Set<string>();
  for (const pick of input.assets) {
    const key = `${pick.kind}:${pick.assetId}`;
    if (seen.has(key)) {
      throw new Error(`Duplicate asset in selection: ${pick.kind} ${pick.assetId}`);
    }
    seen.add(key);

    const statusId = await getAssetStatus(pick.kind, pick.assetId);
    if (statusId == null) {
      throw new Error(`Asset not found: ${pick.kind} ${pick.assetId}`);
    }
    if (!new Set<number>(DISPOSAL_ELIGIBLE_STATUS_IDS).has(statusId)) {
      throw new Error(
        `Asset ${pick.assetId} (${pick.kind}) must be non-active or offline before disposal`,
      );
    }
  }

  const pool = getDbPool();
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    const [disposalResult] = await conn.execute<ResultSetHeader>(
      `INSERT INTO disposal (requested_by, disposal_date, disposal_time, disposal_remarks)
       VALUES (?, ?, ?, ?)`,
      [
        input.requestedBy.trim(),
        input.disposalDate,
        input.disposalTime?.trim() || null,
        input.disposalRemarks?.trim() || null,
      ],
    );
    const disposalId = disposalResult.insertId;

    for (const pick of input.assets) {
      const assetType = disposalAssetType(pick.kind);
      await conn.execute(
        `INSERT INTO disposal_item (disposal_id, asset_id, asset_type, item_remarks)
         VALUES (?, ?, ?, ?)`,
        [disposalId, pick.assetId, assetType, pick.itemRemarks?.trim() || null],
      );

      const table = TABLE_BY_KIND[pick.kind];
      const [updateResult] = await conn.execute(
        `UPDATE \`${table}\` SET status_id = ? WHERE asset_id = ? AND status_id IN (?, ?)`,
        [DISPOSED_STATUS, pick.assetId, STATUS_ID.NON_ACTIVE, STATUS_ID.OFFLINE],
      );
      const affected = (updateResult as { affectedRows?: number }).affectedRows ?? 0;
      if (affected === 0) {
        throw new Error(`Could not mark asset ${pick.assetId} (${pick.kind}) as disposed`);
      }
    }

    await conn.commit();
    return { disposalId, itemCount: input.assets.length };
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}
