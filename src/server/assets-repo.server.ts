import type { RowDataPacket } from 'mysql2';
import type {
  AssetDetail,
  AssetDetailResponse,
  AssetKind,
  AssetTrailEvent,
  AvAsset,
  BulkLaptopHandoverImport,
  BulkPlaceDeploymentImport,
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

export type BulkLaptopImportRow = Omit<CreateLaptopInput, 'assetId'> & {
  assetId?: number;
  handover?: BulkLaptopHandoverImport;
};

export type BulkAvImportRow = Omit<CreateAvInput, 'assetId'> & {
  assetId?: number;
  deployment?: BulkPlaceDeploymentImport;
};

export type BulkNetworkImportRow = Omit<CreateNetworkInput, 'assetId'> & {
  assetId?: number;
  deployment?: BulkPlaceDeploymentImport;
};

async function fillLaptopAssetIds(rows: BulkLaptopImportRow[]): Promise<BulkLaptopImportRow[]> {
  const autoCategories = rows.filter((r) => r.assetId == null || r.assetId <= 0).map((r) => r.category);
  const generated =
    autoCategories.length > 0
      ? await allocateAssetIdsFromDb({ kind: 'laptop', laptopCategories: autoCategories })
      : [];
  let genIdx = 0;
  return rows.map((row) => {
    if (row.assetId != null && row.assetId > 0) {
      return row;
    }
    const assetId = generated[genIdx++];
    if (assetId == null) {
      throw new Error('Failed to generate asset_id for laptop row');
    }
    return { ...row, assetId };
  });
}

async function fillAvAssetIds(rows: BulkAvImportRow[]): Promise<BulkAvImportRow[]> {
  const needCount = rows.filter((r) => r.assetId == null || r.assetId <= 0).length;
  const generated =
    needCount > 0 ? await allocateAssetIdsFromDb({ kind: 'av', count: needCount }) : [];
  let genIdx = 0;
  return rows.map((row) => {
    if (row.assetId != null && row.assetId > 0) {
      return row;
    }
    const assetId = generated[genIdx++];
    if (assetId == null) {
      throw new Error('Failed to generate asset_id for AV row');
    }
    return { ...row, assetId };
  });
}

async function fillNetworkAssetIds(rows: BulkNetworkImportRow[]): Promise<BulkNetworkImportRow[]> {
  const needCount = rows.filter((r) => r.assetId == null || r.assetId <= 0).length;
  const generated =
    needCount > 0 ? await allocateAssetIdsFromDb({ kind: 'network', count: needCount }) : [];
  let genIdx = 0;
  return rows.map((row) => {
    if (row.assetId != null && row.assetId > 0) {
      return row;
    }
    const assetId = generated[genIdx++];
    if (assetId == null) {
      throw new Error('Failed to generate asset_id for network row');
    }
    return { ...row, assetId };
  });
}

async function assertUserStaffId(conn: Awaited<ReturnType<ReturnType<typeof getDbPool>['getConnection']>>, staffId: string) {
  const [rows] = await conn.query<(RowDataPacket & { staff_id: string })[]>(
    'SELECT staff_id FROM users WHERE staff_id = ? LIMIT 1',
    [staffId],
  );
  if (!rows[0]) {
    throw new Error(`Unknown staff_id "${staffId}" (must exist in users)`);
  }
}

async function assertEmployeeNo(
  conn: Awaited<ReturnType<ReturnType<typeof getDbPool>['getConnection']>>,
  employeeNo: string,
) {
  const [rows] = await conn.query<(RowDataPacket & { employee_no: string })[]>(
    'SELECT employee_no FROM staff WHERE employee_no = ? LIMIT 1',
    [employeeNo],
  );
  if (!rows[0]) {
    throw new Error(`Unknown employee_no "${employeeNo}" (must exist in staff directory)`);
  }
}

async function insertLaptopHandover(
  conn: Awaited<ReturnType<ReturnType<typeof getDbPool>['getConnection']>>,
  assetId: number,
  handover: BulkLaptopHandoverImport,
) {
  await assertUserStaffId(conn, handover.handoverStaffId);
  if (handover.employeeNo) {
    await assertEmployeeNo(conn, handover.employeeNo);
  }

  const [handoverResult] = await conn.execute(
    `INSERT INTO handover (asset_id, staff_id, handover_date, handover_remarks)
     VALUES (?, ?, ?, ?)`,
    [assetId, handover.handoverStaffId, handover.handoverDate, handover.handoverRemarks],
  );
  const handoverId = (handoverResult as { insertId: number }).insertId;
  if (handover.employeeNo) {
    await conn.execute(`INSERT INTO handover_staff (employee_no, handover_id) VALUES (?, ?)`, [
      handover.employeeNo,
      handoverId,
    ]);
  }
}

async function insertPlaceDeployment(
  conn: Awaited<ReturnType<ReturnType<typeof getDbPool>['getConnection']>>,
  kind: 'av' | 'network',
  assetId: number,
  deployment: BulkPlaceDeploymentImport,
) {
  await assertUserStaffId(conn, deployment.deploymentStaffId);
  const table = kind === 'av' ? 'av_deployment' : 'network_deployment';
  await conn.execute(
    `INSERT INTO \`${table}\`
      (asset_id, building, level, zone, deployment_date, deployment_remarks, staff_id)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      assetId,
      deployment.building,
      deployment.level,
      deployment.zone,
      deployment.deploymentDate,
      deployment.deploymentRemarks,
      deployment.deploymentStaffId,
    ],
  );
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
    input.assetIdOld ?? null,
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

export async function bulkCreateLaptops(rows: BulkLaptopImportRow[]) {
  const pool = getDbPool();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    for (const row of rows) {
      const { handover, assetId, ...laptop } = row;
      if (assetId == null || assetId <= 0) {
        throw new Error('asset_id is required after ID generation');
      }
      await conn.execute(LAPTOP_INSERT, laptopParams({ ...laptop, assetId }));
      if (handover) {
        await insertLaptopHandover(conn, assetId, handover);
      }
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

export async function bulkCreateAv(rows: BulkAvImportRow[]) {
  const pool = getDbPool();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    for (const row of rows) {
      const { deployment, assetId, ...av } = row;
      if (assetId == null || assetId <= 0) {
        throw new Error('asset_id is required after ID generation');
      }
      await conn.execute(AV_INSERT, avParams({ ...av, assetId }));
      if (deployment) {
        await insertPlaceDeployment(conn, 'av', assetId, deployment);
      }
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

export async function bulkCreateNetwork(rows: BulkNetworkImportRow[]) {
  const pool = getDbPool();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    for (const row of rows) {
      const { deployment, assetId, ...network } = row;
      if (assetId == null || assetId <= 0) {
        throw new Error('asset_id is required after ID generation');
      }
      await conn.execute(NETWORK_INSERT, networkParams({ ...network, assetId }));
      if (deployment) {
        await insertPlaceDeployment(conn, 'network', assetId, deployment);
      }
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

type TimedRow = { created_at?: Date | string | null; updated_at?: Date | string | null };

function trailSortKey(val: Date | string | null | undefined): number {
  if (val == null) return 0;
  const d = val instanceof Date ? val : new Date(val);
  const t = d.getTime();
  return Number.isNaN(t) ? 0 : t;
}

function trailAt(val: Date | string | null | undefined): string {
  if (val == null) return '';
  return val instanceof Date ? val.toISOString() : String(val);
}

function pushTrail(events: AssetTrailEvent[], event: Omit<AssetTrailEvent, 'sortKey'> & { sortKey?: number }) {
  const sortKey = event.sortKey ?? trailSortKey(event.at);
  events.push({ ...event, sortKey, at: event.at || new Date(sortKey).toISOString() });
}

async function listRequestTrails(assetId: number): Promise<AssetTrailEvent[]> {
  const pool = getDbPool();
  const [rows] = await pool.query<
    (RowDataPacket & {
      assignment_id: number;
      assigned_at: Date | string | null;
      checkout_at: Date | string | null;
      returned_at: Date | string | null;
      return_condition: string | null;
      request_id: number;
      requester_name: string;
      asset_type: string | null;
      booked_by: string | null;
      created_at: Date | string;
    })[]
  >(
    `SELECT ra.assignment_id, ra.assigned_at, ra.checkout_at, ra.returned_at, ra.return_condition,
            ra.created_at, r.request_id, u.full_name AS requester_name, ri.asset_type,
            ub.full_name AS booked_by
     FROM request_assignment ra
     INNER JOIN request r ON r.request_id = ra.request_id
     INNER JOIN users u ON u.staff_id = r.requested_by
     LEFT JOIN users ub ON ub.staff_id = ra.assigned_by
     LEFT JOIN request_item ri ON ri.request_item_id = ra.request_item_id
     WHERE ra.asset_id = ?
     ORDER BY ra.assignment_id`,
    [assetId],
  );

  const events: AssetTrailEvent[] = [];
  for (const row of rows) {
    const base = `Request #${row.request_id} · ${row.requester_name}${row.asset_type ? ` · ${row.asset_type}` : ''}`;
    if (row.assigned_at) {
      pushTrail(events, {
        at: trailAt(row.assigned_at),
        category: 'Borrow request',
        title: 'Booked',
        detail: [base, row.booked_by ? `by ${row.booked_by}` : null].filter(Boolean).join(' · '),
      });
    }
    if (row.checkout_at) {
      pushTrail(events, {
        at: trailAt(row.checkout_at),
        category: 'Borrow request',
        title: 'Checked out',
        detail: base,
      });
    }
    if (row.returned_at) {
      pushTrail(events, {
        at: trailAt(row.returned_at),
        category: 'Borrow request',
        title: 'Returned',
        detail: [base, row.return_condition].filter(Boolean).join(' · '),
      });
    }
  }
  return events;
}

async function listLaptopTrails(assetId: number): Promise<AssetTrailEvent[]> {
  const pool = getDbPool();
  const events: AssetTrailEvent[] = [];

  const [handovers] = await pool.query<
    (RowDataPacket & {
      handover_id: number;
      handover_date: Date | string;
      handover_remarks: string | null;
      created_at: Date | string;
      technician_name: string;
      recipients: string | null;
    })[]
  >(
    `SELECT h.handover_id, h.handover_date, h.handover_remarks, h.created_at,
            tech.full_name AS technician_name,
            GROUP_CONCAT(DISTINCT s.full_name ORDER BY s.full_name SEPARATOR ', ') AS recipients
     FROM handover h
     INNER JOIN users tech ON tech.staff_id = h.staff_id
     LEFT JOIN handover_staff hs ON hs.handover_id = h.handover_id
     LEFT JOIN staff s ON s.employee_no = hs.employee_no
     WHERE h.asset_id = ?
     GROUP BY h.handover_id, h.handover_date, h.handover_remarks, h.created_at, tech.full_name
     ORDER BY h.handover_id`,
    [assetId],
  );

  for (const h of handovers) {
    const when = trailAt(h.handover_date) || trailAt(h.created_at);
    const to = h.recipients?.trim() ? `To ${h.recipients}` : 'Place / room handover';
    pushTrail(events, {
      at: when,
      category: 'Handover',
      title: 'Handed over',
      detail: [to, h.technician_name ? `by ${h.technician_name}` : null, h.handover_remarks]
        .filter(Boolean)
        .join(' · '),
    });
  }

  const [returns] = await pool.query<
    (RowDataPacket & {
      return_date: Date | string;
      return_time: string | null;
      return_place: string | null;
      condition: string | null;
      return_remarks: string | null;
      created_at: Date | string;
      returned_by: string;
      recipient_label: string | null;
    })[]
  >(
    `SELECT hr.return_date, hr.return_time, hr.return_place, hr.\`condition\`, hr.return_remarks, hr.created_at,
            ub.full_name AS returned_by,
            COALESCE(s.full_name, 'Place handover') AS recipient_label
     FROM handover_return hr
     INNER JOIN users ub ON ub.staff_id = hr.returned_by
     LEFT JOIN handover_staff hs ON hs.handover_staff_id = hr.handover_staff_id
     LEFT JOIN staff s ON s.employee_no = hs.employee_no
     LEFT JOIN handover h ON h.handover_id = COALESCE(hs.handover_id, hr.handover_id)
     WHERE h.asset_id = ?
     ORDER BY hr.return_id`,
    [assetId],
  );

  for (const r of returns) {
    const at = r.return_time
      ? `${formatDate(r.return_date)}T${r.return_time}`
      : trailAt(r.return_date) || trailAt(r.created_at);
    pushTrail(events, {
      at,
      category: 'Handover',
      title: 'Returned',
      detail: [
        r.recipient_label,
        r.return_place,
        r.condition,
        r.return_remarks,
        `by ${r.returned_by}`,
      ]
        .filter(Boolean)
        .join(' · '),
    });
  }

  return events;
}

async function listPlaceDeployTrails(
  kind: 'av' | 'network',
  assetId: number,
): Promise<AssetTrailEvent[]> {
  const pool = getDbPool();
  const deployTable = kind === 'av' ? 'av_deployment' : 'network_deployment';
  const returnTable = kind === 'av' ? 'av_return' : 'network_return';
  const label = kind === 'av' ? 'AV deployment' : 'Network deployment';
  const events: AssetTrailEvent[] = [];

  const [deployments] = await pool.query<
    (RowDataPacket & {
      deployment_id: number;
      building: string;
      level: string;
      zone: string;
      deployment_date: Date | string;
      deployment_remarks: string | null;
      created_at: Date | string;
      staff_name: string;
    })[]
  >(
    `SELECT d.deployment_id, d.building, d.level, d.zone, d.deployment_date, d.deployment_remarks,
            d.created_at, u.full_name AS staff_name
     FROM \`${deployTable}\` d
     INNER JOIN users u ON u.staff_id = d.staff_id
     WHERE d.asset_id = ?
     ORDER BY d.deployment_id`,
    [assetId],
  );

  for (const d of deployments) {
    const loc = [d.building, d.level, d.zone].filter(Boolean).join(' · ');
    pushTrail(events, {
      at: trailAt(d.deployment_date) || trailAt(d.created_at),
      category: label,
      title: 'Deployed',
      detail: [loc, d.staff_name ? `by ${d.staff_name}` : null, d.deployment_remarks]
        .filter(Boolean)
        .join(' · '),
    });
  }

  const [returns] = await pool.query<
    (RowDataPacket & {
      return_date: Date | string;
      return_time: string | null;
      return_place: string | null;
      condition: string | null;
      return_remarks: string | null;
      created_at: Date | string;
      returned_by: string;
      building: string;
      level: string;
      zone: string;
    })[]
  >(
    `SELECT r.return_date, r.return_time, r.return_place, r.\`condition\`, r.return_remarks, r.created_at,
            ub.full_name AS returned_by, d.building, d.level, d.zone
     FROM \`${returnTable}\` r
     INNER JOIN \`${deployTable}\` d ON d.deployment_id = r.deployment_id
     INNER JOIN users ub ON ub.staff_id = r.returned_by
     WHERE d.asset_id = ?
     ORDER BY r.return_id`,
    [assetId],
  );

  for (const r of returns) {
    const loc = [r.building, r.level, r.zone].filter(Boolean).join(' · ');
    const at = r.return_time
      ? `${formatDate(r.return_date)}T${r.return_time}`
      : trailAt(r.return_date) || trailAt(r.created_at);
    pushTrail(events, {
      at,
      category: label,
      title: 'Returned',
      detail: [loc, r.return_place, r.condition, r.return_remarks, `by ${r.returned_by}`]
        .filter(Boolean)
        .join(' · '),
    });
  }

  return events;
}

async function listMaintenanceTrails(kind: AssetKind, assetId: number): Promise<AssetTrailEvent[]> {
  const pool = getDbPool();
  const events: AssetTrailEvent[] = [];

  const [repairs] = await pool.query<
    (RowDataPacket & {
      repair_date: Date | string;
      completed_date: Date | string | null;
      issue_summary: string;
      repair_remarks: string | null;
      created_at: Date | string;
      staff_name: string;
    })[]
  >(
    `SELECT r.repair_date, r.completed_date, r.issue_summary, r.repair_remarks, r.created_at,
            u.full_name AS staff_name
     FROM repair r
     INNER JOIN users u ON u.staff_id = r.staff_id
     WHERE r.asset_type = ? AND r.asset_id = ?
     ORDER BY r.repair_id`,
    [kind, assetId],
  );

  for (const row of repairs) {
    pushTrail(events, {
      at: trailAt(row.repair_date) || trailAt(row.created_at),
      category: 'Repair',
      title: 'Repair logged',
      detail: [row.issue_summary, row.staff_name ? `by ${row.staff_name}` : null, row.repair_remarks]
        .filter(Boolean)
        .join(' · '),
    });
    if (row.completed_date) {
      pushTrail(events, {
        at: trailAt(row.completed_date),
        category: 'Repair',
        title: 'Repair completed',
        detail: row.issue_summary,
      });
    }
  }

  const [warranties] = await pool.query<
    (RowDataPacket & {
      warranty_start_date: Date | string;
      warranty_end_date: Date | string;
      warranty_remarks: string | null;
      created_at: Date | string;
    })[]
  >(
    `SELECT warranty_start_date, warranty_end_date, warranty_remarks, created_at
     FROM warranty
     WHERE asset_type = ? AND asset_id = ?
     ORDER BY warranty_id`,
    [kind, assetId],
  );

  for (const w of warranties) {
    pushTrail(events, {
      at: trailAt(w.warranty_start_date) || trailAt(w.created_at),
      category: 'Warranty',
      title: 'Warranty registered',
      detail: [`${formatDate(w.warranty_start_date)} → ${formatDate(w.warranty_end_date)}`, w.warranty_remarks]
        .filter(Boolean)
        .join(' · '),
    });
  }

  const [claims] = await pool.query<
    (RowDataPacket & {
      claim_date: Date | string;
      claim_time: string | null;
      issue_summary: string;
      claim_remarks: string | null;
      created_at: Date | string;
      claimed_by: string;
    })[]
  >(
    `SELECT c.claim_date, c.claim_time, c.issue_summary, c.claim_remarks, c.created_at,
            u.full_name AS claimed_by
     FROM warranty_claim c
     INNER JOIN users u ON u.staff_id = c.claimed_by
     WHERE c.asset_type = ? AND c.asset_id = ?
     ORDER BY c.claim_id`,
    [kind, assetId],
  );

  for (const c of claims) {
    const at = c.claim_time
      ? `${formatDate(c.claim_date)}T${c.claim_time}`
      : trailAt(c.claim_date) || trailAt(c.created_at);
    pushTrail(events, {
      at,
      category: 'Warranty',
      title: 'Warranty claim',
      detail: [c.issue_summary, c.claimed_by ? `by ${c.claimed_by}` : null, c.claim_remarks]
        .filter(Boolean)
        .join(' · '),
    });
  }

  if (kind === 'laptop' || kind === 'network') {
    const [disposals] = await pool.query<
      (RowDataPacket & {
        disposal_date: Date | string;
        disposal_remarks: string | null;
        item_remarks: string | null;
        created_at: Date | string;
        requested_by: string;
      })[]
    >(
      `SELECT d.disposal_date, d.disposal_remarks, di.item_remarks, di.created_at,
              u.full_name AS requested_by
       FROM disposal_item di
       INNER JOIN disposal d ON d.disposal_id = di.disposal_id
       INNER JOIN users u ON u.staff_id = d.requested_by
       WHERE di.asset_id = ? AND di.asset_type = ?
       ORDER BY di.disposal_item_id`,
      [assetId, kind],
    );

    for (const row of disposals) {
      pushTrail(events, {
        at: trailAt(row.disposal_date) || trailAt(row.created_at),
        category: 'Disposal',
        title: 'Marked for disposal',
        detail: [row.requested_by ? `by ${row.requested_by}` : null, row.disposal_remarks, row.item_remarks]
          .filter(Boolean)
          .join(' · '),
      });
    }
  }

  return events;
}

export async function getAssetDetail(kind: AssetKind, assetId: number): Promise<AssetDetailResponse | null> {
  const pool = getDbPool();

  if (kind === 'laptop') {
    const [rows] = await pool.query<(LaptopRow & TimedRow & { status_name: string })[]>(
      `SELECT l.*, s.name AS status_name
       FROM laptop l
       INNER JOIN status s ON s.status_id = l.status_id
       WHERE l.asset_id = ?`,
      [assetId],
    );
    const row = rows[0];
    if (!row) return null;
    const asset: AssetDetail = {
      ...mapLaptop(row),
      statusName: row.status_name,
      createdAt: trailAt(row.created_at),
      updatedAt: trailAt(row.updated_at),
    };
    const trails = await buildAssetTrails(kind, assetId, asset);
    return { asset, trails };
  }

  if (kind === 'av') {
    const [rows] = await pool.query<(AvRow & TimedRow & { status_name: string })[]>(
      `SELECT a.*, s.name AS status_name
       FROM av a
       INNER JOIN status s ON s.status_id = a.status_id
       WHERE a.asset_id = ?`,
      [assetId],
    );
    const row = rows[0];
    if (!row) return null;
    const asset: AssetDetail = {
      ...mapAv(row),
      statusName: row.status_name,
      createdAt: trailAt(row.created_at),
      updatedAt: trailAt(row.updated_at),
    };
    const trails = await buildAssetTrails(kind, assetId, asset);
    return { asset, trails };
  }

  const [rows] = await pool.query<(NetworkRow & TimedRow & { status_name: string })[]>(
    `SELECT n.*, s.name AS status_name
     FROM network n
     INNER JOIN status s ON s.status_id = n.status_id
     WHERE n.asset_id = ?`,
    [assetId],
  );
  const row = rows[0];
  if (!row) return null;
  const asset: AssetDetail = {
    ...mapNetwork(row),
    statusName: row.status_name,
    createdAt: trailAt(row.created_at),
    updatedAt: trailAt(row.updated_at),
  };
  const trails = await buildAssetTrails(kind, assetId, asset);
  return { asset, trails };
}

async function buildAssetTrails(
  kind: AssetKind,
  assetId: number,
  asset: AssetDetail,
): Promise<AssetTrailEvent[]> {
  const events: AssetTrailEvent[] = [];

  if (asset.createdAt) {
    pushTrail(events, {
      at: asset.createdAt,
      category: 'Inventory',
      title: 'Registered',
      detail: `${ASSET_KIND_LABEL_FOR_TRAIL[kind]} #${assetId} added to inventory`,
    });
  }

  const chunks = await Promise.all([
    kind === 'laptop' ? listLaptopTrails(assetId) : listPlaceDeployTrails(kind, assetId),
    listRequestTrails(assetId),
    listMaintenanceTrails(kind, assetId),
  ]);

  for (const chunk of chunks) {
    events.push(...chunk);
  }

  return events.sort((a, b) => b.sortKey - a.sortKey);
}

const ASSET_KIND_LABEL_FOR_TRAIL: Record<AssetKind, string> = {
  laptop: 'Laptop',
  av: 'AV',
  network: 'Network',
};
