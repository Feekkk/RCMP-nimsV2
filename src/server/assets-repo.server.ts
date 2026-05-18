import type { RowDataPacket } from 'mysql2';
import type {
  AssetKind,
  AvAsset,
  CreateAvInput,
  CreateLaptopInput,
  CreateNetworkInput,
  LaptopAsset,
  NetworkAsset,
  PurchaseFields,
} from '@/lib/inventory-schema';
import { isAllowedStatusTransition } from '@/lib/asset-status-actions';
import { formatIsoToDdMmYy } from '@/lib/date-format';
import { purchaseSqlParams } from '@/lib/purchase-field-utils';
import { allocateAssetIdsFromDb } from '@/server/asset-id.server';
import { getDbPool } from '@/server/db';

export type BulkLaptopImportRow = Omit<CreateLaptopInput, 'assetId'> & { assetId?: number };
export type BulkAvImportRow = Omit<CreateAvInput, 'assetId'> & { assetId?: number };
export type BulkNetworkImportRow = Omit<CreateNetworkInput, 'assetId'> & { assetId?: number };

async function fillLaptopAssetIds(rows: BulkLaptopImportRow[]): Promise<CreateLaptopInput[]> {
  const autoCategories = rows.filter((r) => r.assetId == null || r.assetId <= 0).map((r) => r.category);
  const generated =
    autoCategories.length > 0
      ? await allocateAssetIdsFromDb({ kind: 'laptop', laptopCategories: autoCategories })
      : [];
  let genIdx = 0;
  return rows.map((row) => {
    if (row.assetId != null && row.assetId > 0) {
      return row as CreateLaptopInput;
    }
    const assetId = generated[genIdx++];
    if (assetId == null) {
      throw new Error('Failed to generate asset_id for laptop row');
    }
    return { ...row, assetId };
  });
}

async function fillAvAssetIds(rows: BulkAvImportRow[]): Promise<CreateAvInput[]> {
  const needCount = rows.filter((r) => r.assetId == null || r.assetId <= 0).length;
  const generated =
    needCount > 0 ? await allocateAssetIdsFromDb({ kind: 'av', count: needCount }) : [];
  let genIdx = 0;
  return rows.map((row) => {
    if (row.assetId != null && row.assetId > 0) {
      return row as CreateAvInput;
    }
    const assetId = generated[genIdx++];
    if (assetId == null) {
      throw new Error('Failed to generate asset_id for AV row');
    }
    return { ...row, assetId };
  });
}

async function fillNetworkAssetIds(rows: BulkNetworkImportRow[]): Promise<CreateNetworkInput[]> {
  const needCount = rows.filter((r) => r.assetId == null || r.assetId <= 0).length;
  const generated =
    needCount > 0 ? await allocateAssetIdsFromDb({ kind: 'network', count: needCount }) : [];
  let genIdx = 0;
  return rows.map((row) => {
    if (row.assetId != null && row.assetId > 0) {
      return row as CreateNetworkInput;
    }
    const assetId = generated[genIdx++];
    if (assetId == null) {
      throw new Error('Failed to generate asset_id for network row');
    }
    return { ...row, assetId };
  });
}

type PurchaseRow = {
  PO_DATE: Date | string | null;
  PO_NUM: string | null;
  DO_DATE: Date | string | null;
  DO_NUM: string | null;
  INVOICE_DATE: Date | string | null;
  INVOICE_NUM: string | null;
  PURCHASE_COST: string | number | null;
};

type LaptopRow = RowDataPacket &
  PurchaseRow & {
    asset_id: number;
    serial_num: string | null;
    brand: string | null;
    model: string | null;
    category: string | null;
    part_number: string | null;
    processor: string | null;
    memory: string | null;
    os: string | null;
    storage: string | null;
    gpu: string | null;
    status_id: number;
    remarks: string | null;
  };

type AvRow = RowDataPacket &
  PurchaseRow & {
    asset_id: number;
    asset_id_old: string | null;
    category: string | null;
    brand: string | null;
    model: string | null;
    serial_num: string | null;
    status_id: number;
    remarks: string | null;
  };

type NetworkRow = RowDataPacket &
  PurchaseRow & {
    asset_id: number;
    serial_num: string | null;
    brand: string | null;
    model: string | null;
    mac_address: string | null;
    ip_address: string | null;
    status_id: number;
    remarks: string | null;
  };

function formatDate(val: Date | string | null | undefined): string | null {
  if (val == null) return null;
  const iso =
    val instanceof Date ? val.toISOString().slice(0, 10) : String(val).trim().slice(0, 10);
  return formatIsoToDdMmYy(iso) ?? iso;
}

function mapPurchase(row: PurchaseRow): PurchaseFields {
  return {
    poDate: formatDate(row.PO_DATE),
    poNum: row.PO_NUM,
    doDate: formatDate(row.DO_DATE),
    doNum: row.DO_NUM,
    invoiceDate: formatDate(row.INVOICE_DATE),
    invoiceNum: row.INVOICE_NUM,
    purchaseCost: row.PURCHASE_COST != null ? Number(row.PURCHASE_COST) : null,
  };
}

function mapLaptop(row: LaptopRow): LaptopAsset {
  return {
    kind: 'laptop',
    assetId: row.asset_id,
    serialNum: row.serial_num,
    brand: row.brand,
    model: row.model,
    category: row.category,
    partNumber: row.part_number,
    processor: row.processor,
    memory: row.memory,
    os: row.os,
    storage: row.storage,
    gpu: row.gpu,
    statusId: row.status_id,
    remarks: row.remarks,
    ...mapPurchase(row),
  };
}

function mapAv(row: AvRow): AvAsset {
  return {
    kind: 'av',
    assetId: row.asset_id,
    assetIdOld: row.asset_id_old,
    category: row.category,
    brand: row.brand,
    model: row.model,
    serialNum: row.serial_num,
    statusId: row.status_id,
    remarks: row.remarks,
    ...mapPurchase(row),
  };
}

function mapNetwork(row: NetworkRow): NetworkAsset {
  return {
    kind: 'network',
    assetId: row.asset_id,
    serialNum: row.serial_num,
    brand: row.brand,
    model: row.model,
    macAddress: row.mac_address,
    ipAddress: row.ip_address,
    statusId: row.status_id,
    remarks: row.remarks,
    ...mapPurchase(row),
  };
}

const LAPTOP_INSERT = `INSERT INTO laptop (
  asset_id, serial_num, brand, model, category, part_number,
  processor, memory, os, storage, gpu,
  PO_DATE, PO_NUM, DO_DATE, DO_NUM, INVOICE_DATE, INVOICE_NUM, PURCHASE_COST,
  status_id, remarks
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

const AV_INSERT = `INSERT INTO av (
  asset_id, asset_id_old, category, brand, model, serial_num,
  PO_DATE, PO_NUM, DO_DATE, DO_NUM, INVOICE_DATE, INVOICE_NUM, PURCHASE_COST,
  status_id, remarks
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

const NETWORK_INSERT = `INSERT INTO network (
  asset_id, serial_num, brand, model, mac_address, ip_address,
  PO_DATE, PO_NUM, DO_DATE, DO_NUM, INVOICE_DATE, INVOICE_NUM, PURCHASE_COST,
  status_id, remarks
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

function laptopParams(input: CreateLaptopInput) {
  return [
    input.assetId,
    input.serialNum,
    input.brand ?? null,
    input.model ?? null,
    input.category,
    input.partNumber ?? null,
    input.processor ?? null,
    input.memory ?? null,
    input.os ?? null,
    input.storage ?? null,
    input.gpu ?? null,
    ...purchaseSqlParams(input),
    input.statusId,
    input.remarks ?? null,
  ];
}

function avParams(input: CreateAvInput) {
  return [
    input.assetId,
    input.assetIdOld,
    input.category ?? null,
    input.brand ?? null,
    input.model ?? null,
    input.serialNum ?? null,
    ...purchaseSqlParams(input),
    input.statusId,
    input.remarks ?? null,
  ];
}

function networkParams(input: CreateNetworkInput) {
  return [
    input.assetId,
    input.serialNum ?? null,
    input.brand ?? null,
    input.model ?? null,
    input.macAddress ?? null,
    input.ipAddress ?? null,
    ...purchaseSqlParams(input),
    input.statusId,
    input.remarks ?? null,
  ];
}

export async function listAssets(kind: AssetKind) {
  const pool = getDbPool();
  if (kind === 'laptop') {
    const [rows] = await pool.query<LaptopRow[]>('SELECT * FROM laptop ORDER BY asset_id');
    return rows.map(mapLaptop);
  }
  if (kind === 'av') {
    const [rows] = await pool.query<AvRow[]>('SELECT * FROM av ORDER BY asset_id');
    return rows.map(mapAv);
  }
  const [rows] = await pool.query<NetworkRow[]>('SELECT * FROM network ORDER BY asset_id');
  return rows.map(mapNetwork);
}

export async function createLaptop(input: CreateLaptopInput) {
  const pool = getDbPool();
  await pool.execute(LAPTOP_INSERT, laptopParams(input));
  const [rows] = await pool.query<LaptopRow[]>('SELECT * FROM laptop WHERE asset_id = ?', [input.assetId]);
  if (!rows[0]) throw new Error('Failed to load created laptop');
  return mapLaptop(rows[0]);
}

export async function createAv(input: CreateAvInput) {
  const pool = getDbPool();
  await pool.execute(AV_INSERT, avParams(input));
  const [rows] = await pool.query<AvRow[]>('SELECT * FROM av WHERE asset_id = ?', [input.assetId]);
  if (!rows[0]) throw new Error('Failed to load created AV asset');
  return mapAv(rows[0]);
}

export async function createNetwork(input: CreateNetworkInput) {
  const pool = getDbPool();
  await pool.execute(NETWORK_INSERT, networkParams(input));
  const [rows] = await pool.query<NetworkRow[]>('SELECT * FROM network WHERE asset_id = ?', [input.assetId]);
  if (!rows[0]) throw new Error('Failed to load created network asset');
  return mapNetwork(rows[0]);
}

export async function bulkCreateLaptops(rows: CreateLaptopInput[]) {
  const pool = getDbPool();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    for (const input of rows) {
      await conn.execute(LAPTOP_INSERT, laptopParams(input));
    }
    await conn.commit();
    return rows.length;
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

export async function bulkCreateAv(rows: CreateAvInput[]) {
  const pool = getDbPool();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    for (const input of rows) {
      await conn.execute(AV_INSERT, avParams(input));
    }
    await conn.commit();
    return rows.length;
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

export async function bulkCreateNetwork(rows: CreateNetworkInput[]) {
  const pool = getDbPool();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    for (const input of rows) {
      await conn.execute(NETWORK_INSERT, networkParams(input));
    }
    await conn.commit();
    return rows.length;
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

export async function bulkCreateLaptopsWithGeneratedIds(rows: BulkLaptopImportRow[]) {
  return bulkCreateLaptops(await fillLaptopAssetIds(rows));
}

export async function bulkCreateAvWithGeneratedIds(rows: BulkAvImportRow[]) {
  return bulkCreateAv(await fillAvAssetIds(rows));
}

export async function bulkCreateNetworkWithGeneratedIds(rows: BulkNetworkImportRow[]) {
  return bulkCreateNetwork(await fillNetworkAssetIds(rows));
}

const TABLE_BY_KIND: Record<AssetKind, string> = {
  laptop: 'laptop',
  av: 'av',
  network: 'network',
};

export async function updateAssetStatus(kind: AssetKind, assetId: number, statusId: number) {
  const items = await listAssets(kind);
  const asset = items.find((a) => a.assetId === assetId);
  if (!asset) {
    throw new Error('Asset not found');
  }
  if (!isAllowedStatusTransition(kind, asset.statusId, statusId)) {
    throw new Error('Status change is not allowed from the current state');
  }

  const pool = getDbPool();
  const table = TABLE_BY_KIND[kind];
  const [result] = await pool.execute(
    `UPDATE \`${table}\` SET status_id = ? WHERE asset_id = ?`,
    [statusId, assetId],
  );
  const affected = (result as { affectedRows?: number }).affectedRows ?? 0;
  if (affected === 0) {
    throw new Error('Asset not found');
  }

  const updated = (await listAssets(kind)).find((a) => a.assetId === assetId);
  if (!updated) {
    throw new Error('Failed to load updated asset');
  }
  return updated;
}
