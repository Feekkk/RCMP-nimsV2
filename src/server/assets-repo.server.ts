import type { RowDataPacket } from 'mysql2';
import type {
  AssetKind,
  AvAsset,
  CreateAvInput,
  CreateLaptopInput,
  CreateNetworkInput,
  LaptopAsset,
  NetworkAsset,
} from '@/lib/inventory-schema';
import { getDbPool } from '@/server/db';

type LaptopRow = RowDataPacket & {
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

type AvRow = RowDataPacket & {
  asset_id: number;
  asset_id_old: string | null;
  category: string | null;
  brand: string | null;
  model: string | null;
  serial_num: string | null;
  status_id: number;
  remarks: string | null;
};

type NetworkRow = RowDataPacket & {
  asset_id: number;
  serial_num: string | null;
  brand: string | null;
  model: string | null;
  mac_address: string | null;
  ip_address: string | null;
  status_id: number;
  remarks: string | null;
};

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
  };
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
  await pool.execute(
    `INSERT INTO laptop (
      asset_id, serial_num, brand, model, category, part_number,
      processor, memory, os, storage, gpu, status_id, remarks
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.assetId,
      input.serialNum ?? null,
      input.brand ?? null,
      input.model,
      input.category ?? null,
      input.partNumber ?? null,
      input.processor ?? null,
      input.memory ?? null,
      input.os ?? null,
      input.storage ?? null,
      input.gpu ?? null,
      input.statusId,
      input.remarks ?? null,
    ],
  );
  return mapLaptop({
    asset_id: input.assetId,
    serial_num: input.serialNum ?? null,
    brand: input.brand ?? null,
    model: input.model,
    category: input.category ?? null,
    part_number: input.partNumber ?? null,
    processor: input.processor ?? null,
    memory: input.memory ?? null,
    os: input.os ?? null,
    storage: input.storage ?? null,
    gpu: input.gpu ?? null,
    status_id: input.statusId,
    remarks: input.remarks ?? null,
  } as LaptopRow);
}

export async function createAv(input: CreateAvInput) {
  const pool = getDbPool();
  await pool.execute(
    `INSERT INTO av (
      asset_id, asset_id_old, category, brand, model, serial_num, status_id, remarks
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.assetId,
      input.assetIdOld ?? null,
      input.category ?? null,
      input.brand ?? null,
      input.model,
      input.serialNum ?? null,
      input.statusId,
      input.remarks ?? null,
    ],
  );
  return mapAv({
    asset_id: input.assetId,
    asset_id_old: input.assetIdOld ?? null,
    category: input.category ?? null,
    brand: input.brand ?? null,
    model: input.model,
    serial_num: input.serialNum ?? null,
    status_id: input.statusId,
    remarks: input.remarks ?? null,
  } as AvRow);
}

export async function createNetwork(input: CreateNetworkInput) {
  const pool = getDbPool();
  await pool.execute(
    `INSERT INTO network (
      asset_id, serial_num, brand, model, mac_address, ip_address, status_id, remarks
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.assetId,
      input.serialNum ?? null,
      input.brand ?? null,
      input.model,
      input.macAddress ?? null,
      input.ipAddress ?? null,
      input.statusId,
      input.remarks ?? null,
    ],
  );
  return mapNetwork({
    asset_id: input.assetId,
    serial_num: input.serialNum ?? null,
    brand: input.brand ?? null,
    model: input.model,
    mac_address: input.macAddress ?? null,
    ip_address: input.ipAddress ?? null,
    status_id: input.statusId,
    remarks: input.remarks ?? null,
  } as NetworkRow);
}

export async function bulkCreateLaptops(rows: CreateLaptopInput[]) {
  const pool = getDbPool();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    for (const input of rows) {
      await conn.execute(
        `INSERT INTO laptop (
          asset_id, serial_num, brand, model, category, part_number,
          processor, memory, os, storage, gpu, status_id, remarks
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          input.assetId,
          input.serialNum ?? null,
          input.brand ?? null,
          input.model,
          input.category ?? null,
          input.partNumber ?? null,
          input.processor ?? null,
          input.memory ?? null,
          input.os ?? null,
          input.storage ?? null,
          input.gpu ?? null,
          input.statusId,
          input.remarks ?? null,
        ],
      );
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
      await conn.execute(
        `INSERT INTO av (
          asset_id, asset_id_old, category, brand, model, serial_num, status_id, remarks
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          input.assetId,
          input.assetIdOld ?? null,
          input.category ?? null,
          input.brand ?? null,
          input.model,
          input.serialNum ?? null,
          input.statusId,
          input.remarks ?? null,
        ],
      );
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
      await conn.execute(
        `INSERT INTO network (
          asset_id, serial_num, brand, model, mac_address, ip_address, status_id, remarks
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          input.assetId,
          input.serialNum ?? null,
          input.brand ?? null,
          input.model,
          input.macAddress ?? null,
          input.ipAddress ?? null,
          input.statusId,
          input.remarks ?? null,
        ],
      );
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
