import type { RowDataPacket } from 'mysql2';
import type { AssetId, AssetKind } from '@shared/lib/inventory-schema';
import type {
  WarrantyContext,
  WarrantyInput,
  WarrantyRecord,
} from '@shared/lib/warranty-repair-schema';
import { coerceToIsoDate, localDateToIso, sqlDateToIso as toIsoDate } from '@shared/lib/date-format';
import { getDbPool } from '@backend/server/core/db';

type WarrantyRow = RowDataPacket & {
  warranty_id: number;
  asset_id: number;
  asset_type: AssetKind;
  warranty_start_date: Date | string;
  warranty_end_date: Date | string;
  warranty_remarks: string | null;
};

function todayIso(): string {
  return localDateToIso(new Date());
}

function mapWarranty(row: WarrantyRow): WarrantyRecord {
  return {
    warrantyId: row.warranty_id,
    assetId: row.asset_id,
    assetType: row.asset_type,
    startDate: toIsoDate(row.warranty_start_date),
    endDate: toIsoDate(row.warranty_end_date),
    remarks: row.warranty_remarks,
  };
}

export function isWarrantyActive(w: WarrantyRecord, onDate = todayIso()): boolean {
  return onDate >= w.startDate && onDate <= w.endDate;
}

export async function insertWarranty(
  kind: AssetKind,
  assetId: string | number,
  input: WarrantyInput,
  conn?: import('mysql2/promise').PoolConnection,
) {
  const startDate = coerceToIsoDate(input.startDate);
  const endDate = coerceToIsoDate(input.endDate);
  if (!startDate || !endDate) {
    throw new Error('Warranty dates are not valid. Pick a start date and an end date from the calendar.');
  }
  if (endDate < startDate) {
    throw new Error('Warranty end date must be on or after the start date.');
  }

  const pool = conn ?? getDbPool();
  const executor = conn ? conn.execute.bind(conn) : pool.execute.bind(pool);
  await executor(
    `INSERT INTO warranty (asset_id, asset_type, warranty_start_date, warranty_end_date, warranty_remarks)
     VALUES (?, ?, ?, ?, ?)`,
    [String(assetId), kind, startDate, endDate, input.remarks ?? null],
  );
}

export async function getWarrantyForAsset(kind: AssetKind, assetId: AssetId): Promise<WarrantyRecord | null> {
  const pool = getDbPool();
  const [rows] = await pool.query<WarrantyRow[]>(
    `SELECT warranty_id, asset_id, asset_type, warranty_start_date, warranty_end_date, warranty_remarks
     FROM warranty
     WHERE asset_type = ? AND asset_id = ?
     ORDER BY warranty_id DESC
     LIMIT 1`,
    [kind, assetId],
  );
  return rows[0] ? mapWarranty(rows[0]) : null;
}

export async function getWarrantyContext(kind: AssetKind, assetId: AssetId): Promise<WarrantyContext> {
  const warranty = await getWarrantyForAsset(kind, assetId);
  return {
    warranty,
    isActive: warranty ? isWarrantyActive(warranty) : false,
  };
}
