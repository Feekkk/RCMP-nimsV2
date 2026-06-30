import type { RowDataPacket } from 'mysql2';
import type { AssetKind } from '@/lib/inventory-schema';
import type {
  RepairInput,
  WarrantyClaimInput,
  WarrantyContext,
  WarrantyInput,
  WarrantyRecord,
} from '@/lib/warranty-repair-schema';
import { getDbPool } from '@/server/db';

type WarrantyRow = RowDataPacket & {
  warranty_id: number;
  asset_id: number;
  asset_type: AssetKind;
  warranty_start_date: Date | string;
  warranty_end_date: Date | string;
  warranty_remarks: string | null;
};

type ClaimRow = RowDataPacket & {
  claim_id: number;
  claim_date: Date | string;
  issue_summary: string;
  claim_remarks: string | null;
};

function toIsoDate(d: Date | string): string {
  if (typeof d === 'string') return d.slice(0, 10);
  return d.toISOString().slice(0, 10);
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
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
  assetId: number,
  input: WarrantyInput,
  conn?: import('mysql2/promise').PoolConnection,
) {
  const pool = conn ?? getDbPool();
  const executor = conn ? conn.execute.bind(conn) : pool.execute.bind(pool);
  await executor(
    `INSERT INTO warranty (asset_id, asset_type, warranty_start_date, warranty_end_date, warranty_remarks)
     VALUES (?, ?, ?, ?, ?)`,
    [assetId, kind, input.startDate, input.endDate, input.remarks ?? null],
  );
}

export async function getWarrantyForAsset(kind: AssetKind, assetId: number): Promise<WarrantyRecord | null> {
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

export async function getWarrantyContext(kind: AssetKind, assetId: number): Promise<WarrantyContext> {
  const pool = getDbPool();
  const warranty = await getWarrantyForAsset(kind, assetId);
  const isActive = warranty ? isWarrantyActive(warranty) : false;

  const [claims] = await pool.query<ClaimRow[]>(
    `SELECT claim_id, claim_date, issue_summary, claim_remarks
     FROM warranty_claim
     WHERE asset_type = ? AND asset_id = ?
     ORDER BY claim_id DESC
     LIMIT 10`,
    [kind, assetId],
  );

  return {
    warranty,
    isActive,
    recentClaims: claims.map((c) => ({
      claimId: c.claim_id,
      claimDate: toIsoDate(c.claim_date),
      issueSummary: c.issue_summary,
      claimRemarks: c.claim_remarks,
    })),
  };
}

export async function createWarrantyClaim(input: WarrantyClaimInput) {
  const ctx = await getWarrantyContext(input.kind, input.assetId);
  if (!ctx.warranty) {
    throw new Error(
      'There is no warranty on file for this asset. Add warranty details before submitting a claim.',
    );
  }
  if (!isWarrantyActive(ctx.warranty, input.claimDate.slice(0, 10))) {
    throw new Error(
      'The repair date falls outside the warranty period. Choose a date within the warranty start and end dates.',
    );
  }

  const pool = getDbPool();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [result] = await conn.execute(
      `INSERT INTO warranty_claim
         (asset_id, asset_type, warranty_id, claim_date, claim_time, issue_summary, claim_remarks, claimed_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        input.assetId,
        input.kind,
        ctx.warranty.warrantyId,
        input.claimDate,
        input.claimTime ?? null,
        input.issueSummary,
        input.claimRemarks ?? null,
        input.claimedBy,
      ],
    );
    const claimId = (result as { insertId?: number }).insertId ?? 0;

    await conn.commit();
    return { claimId, statusRestored: false };
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

export async function createRepair(input: RepairInput) {
  const pool = getDbPool();
  const conn = await pool.getConnection();
  const completedDate = input.completedDate ?? input.repairDate;
  try {
    await conn.beginTransaction();

    const [result] = await conn.execute(
      `INSERT INTO repair (asset_id, asset_type, user_id, repair_date, completed_date, issue_summary, repair_remarks)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        input.assetId,
        input.kind,
        input.staffId,
        input.repairDate,
        completedDate,
        input.issueSummary,
        input.repairRemarks ?? null,
      ],
    );
    const repairId = (result as { insertId?: number }).insertId ?? 0;

    await conn.commit();
    return { repairId, statusRestored: false };
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}
