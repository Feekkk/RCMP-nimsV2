import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { AssetId, AssetKind } from '@shared/lib/inventory-schema';
import { STATUS_ID } from '@shared/lib/asset-status-actions';
import {
  DISPOSAL_PUSAT_DEFAULT,
  isPredisposalReason,
  malaysiaTodayIso,
  resolvePredisposalReason,
  type DisposalHistoryAsset,
  type DisposalHistoryBatch,
  type DisposalReport,
  type DisposalReportAsset,
  type PredisposalReason,
  type SubmitDisposalBatchAssetInput,
  type SubmitDisposalBatchInput,
  type SubmitDisposalBatchResult,
} from '@shared/lib/disposal-schema';
import { attachDisplayNames } from '@backend/server/core/azure-directory.server';
import { getDbPool } from '@backend/server/core/db';

type DbConnection = Awaited<ReturnType<ReturnType<typeof getDbPool>['getConnection']>>;

const TABLE_BY_KIND: Record<AssetKind, string> = {
  laptop: 'laptop',
  av: 'av',
  network: 'network',
};

const ASSET_KINDS: AssetKind[] = ['laptop', 'av', 'network'];

export function sqlUtf8AssetId(expr: string): string {
  return `CONVERT(${expr} USING utf8mb4) COLLATE utf8mb4_unicode_ci`;
}

function parseStaffUserId(staffId: string): number {
  const userId = Number.parseInt(staffId.trim(), 10);
  if (!Number.isFinite(userId) || userId <= 0) {
    throw new Error('Your technician session could not be verified. Sign out and sign in again.');
  }
  return userId;
}

function assetIdValue(kind: AssetKind, assetId: AssetId): string {
  return kind === 'laptop' ? String(assetId).trim() : String(assetId);
}

function formatDateTimeIso(val: Date | string | null | undefined): string | null {
  if (val == null) return null;
  const d = val instanceof Date ? val : new Date(val);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function formatSqlDate(val: Date | string | null | undefined): string | null {
  if (val == null) return null;
  if (typeof val === 'string') {
    const iso = val.slice(0, 10);
    return /^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso : null;
  }
  if (Number.isNaN(val.getTime())) return null;
  const y = val.getFullYear();
  const m = String(val.getMonth() + 1).padStart(2, '0');
  const d = String(val.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatSqlTime(val: Date | string | null | undefined): string | null {
  if (val == null) return null;
  if (typeof val === 'string') {
    const m = val.match(/^(\d{2}:\d{2})(?::\d{2})?/);
    return m?.[1] ?? null;
  }
  if (Number.isNaN(val.getTime())) return null;
  return `${String(val.getHours()).padStart(2, '0')}:${String(val.getMinutes()).padStart(2, '0')}`;
}

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

function isAssetKind(value: string): value is AssetKind {
  return ASSET_KINDS.includes(value as AssetKind);
}

function normalizeDisposalDate(raw: string): string {
  const iso = raw.trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    throw new Error('Choose a valid disposal date.');
  }
  return iso;
}

function normalizeDisposalTime(raw: string | null | undefined): string | null {
  const value = raw?.trim();
  if (!value) return null;
  const match = value.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (!match) throw new Error('Choose a valid disposal time.');
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) throw new Error('Choose a valid disposal time.');
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`;
}

async function findActivePreDisposalId(
  conn: DbConnection,
  kind: AssetKind,
  assetId: AssetId,
): Promise<number | null> {
  const [rows] = await conn.query<(RowDataPacket & { pre_disposal_id: number })[]>(
    `SELECT pre_disposal_id
     FROM pre_disposal
     WHERE asset_type = ? AND asset_id = ? AND status IN ('pending', 'in_disposal')
     LIMIT 1`,
    [kind, assetIdValue(kind, assetId)],
  );
  return rows[0]?.pre_disposal_id ?? null;
}

export async function recordAssetPredisposed(
  conn: DbConnection,
  input: {
    kind: AssetKind;
    assetId: AssetId;
    staffId: string;
    reason?: PredisposalReason;
    skipIfQueued?: boolean;
  },
): Promise<void> {
  const userId = parseStaffUserId(input.staffId);
  const assetId = assetIdValue(input.kind, input.assetId);
  const existingId = await findActivePreDisposalId(conn, input.kind, assetId);
  if (existingId != null) {
    if (input.skipIfQueued) return;
    throw new Error('This asset is already in the pre-disposed queue.');
  }

  await conn.execute(
    `INSERT INTO pre_disposal (asset_id, asset_type, reason, marked_by, status)
     VALUES (?, ?, ?, ?, 'pending')`,
    [assetId, input.kind, input.reason ?? 'manual', userId],
  );
}

export async function recordAssetPredisposalRemoved(
  conn: DbConnection,
  input: { kind: AssetKind; assetId: AssetId; staffId: string },
): Promise<void> {
  const [result] = await conn.execute<ResultSetHeader>(
    `UPDATE pre_disposal
     SET status = 'cancelled'
     WHERE asset_type = ? AND asset_id = ? AND status = 'pending'`,
    [input.kind, assetIdValue(input.kind, input.assetId)],
  );
  if (result.affectedRows === 0) {
    throw new Error('This asset is not in the pending disposal queue.');
  }
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

export function reasonFromAssetDates(
  poDate: string | null | undefined,
  doDate: string | null | undefined,
  fallback: PredisposalReason = 'manual',
): PredisposalReason {
  return resolvePredisposalReason({ fallback, poDate, doDate });
}

async function nextNoRujukanPelupusan(conn: DbConnection): Promise<string> {
  const prefix = `PLP-${malaysiaTodayIso().replaceAll('-', '')}-`;
  const [rows] = await conn.query<(RowDataPacket & { no_rujukan_pelupusan: string })[]>(
    `SELECT no_rujukan_pelupusan
     FROM disposal
     WHERE no_rujukan_pelupusan LIKE ?
     ORDER BY no_rujukan_pelupusan DESC
     LIMIT 1
     FOR UPDATE`,
    [`${prefix}%`],
  );
  const last = rows[0]?.no_rujukan_pelupusan ?? '';
  const seqPart = last.startsWith(prefix) ? last.slice(prefix.length) : '';
  const next = (Number.parseInt(seqPart, 10) || 0) + 1;
  return `${prefix}${String(next).padStart(4, '0')}`;
}

type LockedPreDisposalRow = RowDataPacket & {
  pre_disposal_id: number;
  asset_id: string;
  asset_type: string;
  status: string;
};

function optionalText(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function optionalPath(value: string | null | undefined): string | null {
  const trimmed = optionalText(value);
  if (!trimmed) return null;
  if (trimmed.length > 512) {
    throw new Error('Image path/URL must be 512 characters or fewer.');
  }
  return trimmed;
}

export async function submitDisposalBatch(
  input: SubmitDisposalBatchInput,
  staffId: string,
): Promise<SubmitDisposalBatchResult> {
  if (input.assets.length === 0) {
    throw new Error('Select at least one asset to dispose.');
  }
  const disposalDate = normalizeDisposalDate(input.disposalDate);
  const disposalTime = normalizeDisposalTime(input.disposalTime);
  const pusat = input.pusat?.trim() || DISPOSAL_PUSAT_DEFAULT;
  const remarks = optionalText(input.remarks);
  const submittedBy = parseStaffUserId(staffId);

  const uniqueKeys = new Map<string, SubmitDisposalBatchAssetInput>();
  for (const asset of input.assets) {
    uniqueKeys.set(`${asset.kind}:${assetIdValue(asset.kind, asset.assetId)}`, asset);
  }
  const selected = [...uniqueKeys.values()];

  return withAssetPredisposalTransaction(async (conn) => {
    const placeholders = selected.map(() => '(?, ?)').join(', ');
    const params = selected.flatMap((asset) => [asset.kind, assetIdValue(asset.kind, asset.assetId)]);
    const [rows] = await conn.query<LockedPreDisposalRow[]>(
      `SELECT pre_disposal_id, asset_id, asset_type, status
       FROM pre_disposal
       WHERE (asset_type, asset_id) IN (${placeholders})
       FOR UPDATE`,
      params,
    );

    const byKey = new Map(rows.map((row) => [`${row.asset_type}:${row.asset_id}`, row]));
    for (const asset of selected) {
      const row = byKey.get(`${asset.kind}:${assetIdValue(asset.kind, asset.assetId)}`);
      if (!row || row.status !== 'pending') {
        throw new Error(
          `${asset.kind} ${asset.assetId} is not pending in the disposal queue and cannot be submitted.`,
        );
      }
    }

    const noRujukanPelupusan = await nextNoRujukanPelupusan(conn);

    for (const asset of selected) {
      const row = byKey.get(`${asset.kind}:${assetIdValue(asset.kind, asset.assetId)}`);
      if (!row) continue;
      const table = TABLE_BY_KIND[asset.kind];
      const [statusRows] = await conn.execute<(RowDataPacket & { status_id: number })[]>(
        `SELECT status_id FROM \`${table}\` WHERE asset_id = ?`,
        [asset.assetId],
      );
      const statusId = statusRows[0]?.status_id;
      if (statusId == null) {
        throw new Error(`${asset.kind} ${asset.assetId} could not be found.`);
      }
      if (statusId === STATUS_ID.DISPOSED) {
        throw new Error(`${asset.kind} ${asset.assetId} is already disposed.`);
      }

      await conn.execute(
        `INSERT INTO disposal (
           no_rujukan_pelupusan, pre_disposal_id, asset_id, asset_type,
           submitted_by, disposal_date, disposal_time, pusat, disposal_remarks,
           latar_belakang, rekod_fizikal_harta, image_whole_asset, image_serial_number
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          noRujukanPelupusan,
          row.pre_disposal_id,
          assetIdValue(asset.kind, asset.assetId),
          asset.kind,
          submittedBy,
          disposalDate,
          disposalTime,
          pusat,
          remarks,
          optionalText(asset.latarBelakang),
          optionalText(asset.rekodFizikalHarta),
          optionalPath(asset.imageWholeAsset),
          optionalPath(asset.imageSerialNumber),
        ],
      );

      await conn.execute(
        `UPDATE pre_disposal SET status = 'in_disposal' WHERE pre_disposal_id = ? AND status = 'pending'`,
        [row.pre_disposal_id],
      );

      await conn.execute(`UPDATE \`${table}\` SET status_id = ? WHERE asset_id = ?`, [
        STATUS_ID.DISPOSED,
        asset.assetId,
      ]);
    }

    return { noRujukanPelupusan, submitted: selected.length };
  });
}

type HistoryQueryRow = RowDataPacket & {
  disposal_id: number;
  no_rujukan_pelupusan: string;
  asset_id: string;
  asset_type: string;
  submitted_at: Date | string | null;
  disposal_date: Date | string | null;
  pusat: string;
  disposal_remarks: string | null;
  submitted_email: string | null;
  submitted_oid: string | null;
  submitted_name?: string | null;
  brand: string | null;
  model: string | null;
  serial_num: string | null;
  asset_id_old: string | null;
};

export async function listDisposalHistory(): Promise<DisposalHistoryBatch[]> {
  const pool = getDbPool();
  const [rows] = await pool.query<HistoryQueryRow[]>(
    `SELECT
       d.disposal_id, d.no_rujukan_pelupusan, d.asset_id, d.asset_type,
       d.submitted_at, d.disposal_date, d.pusat, d.disposal_remarks,
       u.email AS submitted_email, u.oid AS submitted_oid,
       COALESCE(l.brand, av.brand, n.brand) AS brand,
       COALESCE(l.model, av.model, n.model) AS model,
       COALESCE(l.serial_num, av.serial_num, n.serial_num) AS serial_num,
       av.asset_id_old
     FROM disposal d
     LEFT JOIN users u ON u.id = d.submitted_by
     LEFT JOIN laptop l ON d.asset_type = 'laptop' AND ${sqlUtf8AssetId('l.asset_id')} = ${sqlUtf8AssetId('d.asset_id')}
     LEFT JOIN av ON d.asset_type = 'av' AND ${sqlUtf8AssetId('av.asset_id')} = ${sqlUtf8AssetId('d.asset_id')}
     LEFT JOIN network n ON d.asset_type = 'network' AND ${sqlUtf8AssetId('n.asset_id')} = ${sqlUtf8AssetId('d.asset_id')}
     ORDER BY d.submitted_at DESC, d.disposal_id DESC`,
  );
  await attachDisplayNames(rows, 'submitted_oid', 'submitted_name');

  const batches = new Map<string, DisposalHistoryBatch>();
  const order: string[] = [];
  for (const row of rows) {
    if (!isAssetKind(row.asset_type)) continue;
    const asset: DisposalHistoryAsset = {
      disposalId: row.disposal_id,
      kind: row.asset_type,
      assetId: row.asset_id,
      assetIdOld: row.asset_id_old ?? null,
      brand: row.brand,
      model: row.model,
      serialNum: row.serial_num,
    };
    let batch = batches.get(row.no_rujukan_pelupusan);
    if (!batch) {
      batch = {
        noRujukanPelupusan: row.no_rujukan_pelupusan,
        submittedAt: formatDateTimeIso(row.submitted_at),
        disposalDate: formatSqlDate(row.disposal_date),
        submittedBy: row.submitted_name?.trim() || row.submitted_email?.trim() || null,
        pusat: row.pusat,
        remarks: row.disposal_remarks,
        assetCount: 0,
        assets: [],
      };
      batches.set(row.no_rujukan_pelupusan, batch);
      order.push(row.no_rujukan_pelupusan);
    }
    batch.assets.push(asset);
    batch.assetCount = batch.assets.length;
  }
  return order.map((key) => batches.get(key)!);
}

type ReportQueryRow = RowDataPacket & {
  no_rujukan_pelupusan: string;
  asset_id: string;
  asset_type: string;
  pusat: string;
  disposal_date: Date | string | null;
  disposal_time: Date | string | null;
  submitted_at: Date | string | null;
  latar_belakang: string | null;
  rekod_fizikal_harta: string | null;
  image_whole_asset: string | null;
  image_serial_number: string | null;
  brand: string | null;
  model: string | null;
  serial_num: string | null;
  supplier: string | null;
  acc_code: string | null;
  asset_id_old: string | null;
  po_date: Date | string | null;
  do_date: Date | string | null;
  purchase_cost: number | string | null;
};

type RepairQueryRow = RowDataPacket & {
  asset_id: string;
  asset_type: string;
  repair_date: Date | string | null;
  issue_summary: string | null;
};

export async function getDisposalReport(noRujukanPelupusan: string): Promise<DisposalReport> {
  const rujukan = noRujukanPelupusan.trim();
  if (!rujukan) throw new Error('Missing disposal reference number.');

  const pool = getDbPool();
  const [rows] = await pool.query<ReportQueryRow[]>(
    `SELECT
       d.no_rujukan_pelupusan, d.asset_id, d.asset_type, d.pusat,
       d.disposal_date, d.disposal_time, d.submitted_at,
       d.latar_belakang, d.rekod_fizikal_harta,
       d.image_whole_asset, d.image_serial_number,
       COALESCE(l.brand, av.brand, n.brand) AS brand,
       COALESCE(l.model, av.model, n.model) AS model,
       COALESCE(l.serial_num, av.serial_num, n.serial_num) AS serial_num,
       COALESCE(l.supplier, av.supplier, n.supplier) AS supplier,
       COALESCE(l.acc_code, av.acc_code, n.acc_code) AS acc_code,
       av.asset_id_old,
       COALESCE(l.PO_DATE, av.PO_DATE, n.PO_DATE) AS po_date,
       COALESCE(l.DO_DATE, av.DO_DATE, n.DO_DATE) AS do_date,
       COALESCE(l.PURCHASE_COST, av.PURCHASE_COST, n.PURCHASE_COST) AS purchase_cost
     FROM disposal d
     LEFT JOIN laptop l ON d.asset_type = 'laptop' AND ${sqlUtf8AssetId('l.asset_id')} = ${sqlUtf8AssetId('d.asset_id')}
     LEFT JOIN av ON d.asset_type = 'av' AND ${sqlUtf8AssetId('av.asset_id')} = ${sqlUtf8AssetId('d.asset_id')}
     LEFT JOIN network n ON d.asset_type = 'network' AND ${sqlUtf8AssetId('n.asset_id')} = ${sqlUtf8AssetId('d.asset_id')}
     WHERE d.no_rujukan_pelupusan = ?
     ORDER BY d.disposal_id`,
    [rujukan],
  );
  if (rows.length === 0) {
    throw new Error('No submitted disposal was found for this reference number.');
  }

  const repairParams = rows.flatMap((row) => [row.asset_type, row.asset_id]);
  const repairPlaceholders = rows.map(() => '(?, ?)').join(', ');
  const [repairs] =
    rows.length === 0
      ? [[]]
      : await pool.query<RepairQueryRow[]>(
          `SELECT asset_id, asset_type, repair_date, issue_summary
           FROM repair
           WHERE (asset_type, ${sqlUtf8AssetId('asset_id')}) IN (${repairPlaceholders})
           ORDER BY repair_date ASC, repair_id ASC`,
          repairParams,
        );

  const repairsByKey = new Map<string, DisposalReportAsset['repairs']>();
  for (const repair of repairs) {
    const key = `${repair.asset_type}:${repair.asset_id}`;
    const list = repairsByKey.get(key) ?? [];
    list.push({
      repairDate: formatSqlDate(repair.repair_date),
      issueSummary: repair.issue_summary,
    });
    repairsByKey.set(key, list);
  }

  const assets: DisposalReportAsset[] = rows.map((row) => {
    if (!isAssetKind(row.asset_type)) {
      throw new Error('A disposal row has an unknown asset type.');
    }
    const nama = [row.brand, row.model].filter(Boolean).join(' ').trim() || String(row.asset_id);
    const costRaw = row.purchase_cost;
    const purchaseCost =
      costRaw == null || costRaw === ''
        ? null
        : Number(costRaw);
    return {
      kind: row.asset_type,
      assetId: row.asset_id,
      assetIdOld: row.asset_id_old ?? null,
      nama,
      supplier: row.supplier,
      brand: row.brand,
      model: row.model,
      serialNum: row.serial_num,
      accCode: row.acc_code,
      tarikhPenerimaan: formatSqlDate(row.do_date) ?? formatSqlDate(row.po_date),
      purchaseCost: purchaseCost != null && Number.isFinite(purchaseCost) ? purchaseCost : null,
      qty: 1,
      imageWholeAsset: row.image_whole_asset,
      imageSerialNumber: row.image_serial_number,
      latarBelakang: row.latar_belakang,
      rekodFizikalHarta: row.rekod_fizikal_harta,
      repairs: repairsByKey.get(`${row.asset_type}:${row.asset_id}`) ?? [],
    };
  });

  const first = rows[0];
  return {
    noRujukanPelupusan: first.no_rujukan_pelupusan,
    pusat: first.pusat,
    disposalDate: formatSqlDate(first.disposal_date),
    disposalTime: formatSqlTime(first.disposal_time),
    submittedAt: formatDateTimeIso(first.submitted_at),
    lampiran1: assets,
    lampiran2: assets,
    borangTp10: assets,
  };
}

export async function getDisposalDashboardStatsFromTables(): Promise<{
  pending: number;
  disposedThisMonth: number;
  disposedThisYear: number;
}> {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const monthStart = `${year}-${pad2(month + 1)}-01`;
  const nextMonth = month === 11 ? `${year + 1}-01-01` : `${year}-${pad2(month + 2)}-01`;
  const yearStart = `${year}-01-01`;
  const nextYear = `${year + 1}-01-01`;

  const pool = getDbPool();
  const [[pendingRows], [monthRows], [yearRows]] = await Promise.all([
    pool.query<(RowDataPacket & { n: number })[]>(
      `SELECT COUNT(*) AS n FROM pre_disposal WHERE status = 'pending'`,
    ),
    pool.query<(RowDataPacket & { n: number })[]>(
      `SELECT COUNT(*) AS n
       FROM disposal
       WHERE COALESCE(disposal_date, DATE(submitted_at)) >= ? AND COALESCE(disposal_date, DATE(submitted_at)) < ?`,
      [monthStart, nextMonth],
    ),
    pool.query<(RowDataPacket & { n: number })[]>(
      `SELECT COUNT(*) AS n
       FROM disposal
       WHERE COALESCE(disposal_date, DATE(submitted_at)) >= ? AND COALESCE(disposal_date, DATE(submitted_at)) < ?`,
      [yearStart, nextYear],
    ),
  ]);

  return {
    pending: Number(pendingRows[0]?.n ?? 0),
    disposedThisMonth: Number(monthRows[0]?.n ?? 0),
    disposedThisYear: Number(yearRows[0]?.n ?? 0),
  };
}
