import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { AssetKind } from '@shared/lib/inventory-schema';
import type {
  AddPmChecklistItemInput,
  CreatePmChecklistInput,
  CreatePmLogInput,
  CreatePmLogResult,
  PmChecklistDetail,
  PmChecklistItem,
  PmChecklistSummary,
  PmItemResult,
  PmLocationTree,
  PmLogListFilters,
  PmLogListRow,
  PmLogStatus,
  PmPlaceAsset,
  PmStats,
  UpdatePmChecklistInput,
  UpdatePmChecklistItemInput,
} from '@shared/lib/pm-schema';
import { derivePmLogStatus } from '@shared/lib/pm-schema';
import { getDbPool } from '@backend/server/core/db';

function toIsoDate(d: Date | string): string {
  if (typeof d === 'string') return d.slice(0, 10);
  return d.toISOString().slice(0, 10);
}

function monthBounds(now = new Date()): { from: string; to: string } {
  const y = now.getFullYear();
  const m = now.getMonth();
  const from = `${y}-${String(m + 1).padStart(2, '0')}-01`;
  const last = new Date(y, m + 1, 0).getDate();
  const to = `${y}-${String(m + 1).padStart(2, '0')}-${String(last).padStart(2, '0')}`;
  return { from, to };
}

function placeKey(building: string, level: string) {
  return `${building}\0${level}`;
}

type ChecklistRow = RowDataPacket & {
  checklist_id: number;
  asset_type: AssetKind;
  asset_category: string;
  checklist_name: string;
  item_count: number;
};

type ItemRow = RowDataPacket & {
  item_id: number;
  checklist_id: number;
  item_description: string;
};

function mapChecklistSummary(row: ChecklistRow): PmChecklistSummary {
  return {
    checklistId: row.checklist_id,
    assetType: row.asset_type,
    assetCategory: row.asset_category,
    checklistName: row.checklist_name,
    itemCount: Number(row.item_count) || 0,
  };
}

export async function listPmChecklists(): Promise<PmChecklistSummary[]> {
  const pool = getDbPool();
  const [rows] = await pool.query<ChecklistRow[]>(
    `SELECT c.checklist_id, c.asset_type, c.asset_category, c.checklist_name,
            COUNT(i.item_id) AS item_count
     FROM pm_checklist c
     LEFT JOIN pm_checklist_item i ON i.checklist_id = c.checklist_id
     GROUP BY c.checklist_id, c.asset_type, c.asset_category, c.checklist_name
     ORDER BY c.asset_type, c.asset_category`,
  );
  return rows.map(mapChecklistSummary);
}

export async function listPmAssetCategories(assetType: AssetKind): Promise<string[]> {
  const pool = getDbPool();
  const table =
    assetType === 'laptop' ? 'laptop' : assetType === 'av' ? 'av' : 'network';
  const [rows] = await pool.query<(RowDataPacket & { category: string })[]>(
    `SELECT DISTINCT category
     FROM \`${table}\`
     WHERE category IS NOT NULL AND TRIM(category) <> ''
     ORDER BY category`,
  );
  return rows.map((r) => r.category.trim());
}

export async function getPmChecklistDetail(checklistId: number): Promise<PmChecklistDetail | null> {
  const pool = getDbPool();
  const [headers] = await pool.query<ChecklistRow[]>(
    `SELECT c.checklist_id, c.asset_type, c.asset_category, c.checklist_name,
            COUNT(i.item_id) AS item_count
     FROM pm_checklist c
     LEFT JOIN pm_checklist_item i ON i.checklist_id = c.checklist_id
     WHERE c.checklist_id = ?
     GROUP BY c.checklist_id, c.asset_type, c.asset_category, c.checklist_name
     LIMIT 1`,
    [checklistId],
  );
  const header = headers[0];
  if (!header) return null;

  const [items] = await pool.query<ItemRow[]>(
    `SELECT item_id, checklist_id, item_description
     FROM pm_checklist_item
     WHERE checklist_id = ?
     ORDER BY item_id`,
    [checklistId],
  );

  return {
    ...mapChecklistSummary(header),
    items: items.map(
      (row): PmChecklistItem => ({
        itemId: row.item_id,
        checklistId: row.checklist_id,
        itemDescription: row.item_description,
      }),
    ),
  };
}

export async function getPmChecklistForAsset(
  assetType: AssetKind,
  assetCategory: string,
): Promise<PmChecklistDetail | null> {
  const category = assetCategory.trim();
  if (!category) return null;

  const pool = getDbPool();
  const [headers] = await pool.query<(RowDataPacket & { checklist_id: number })[]>(
    `SELECT checklist_id
     FROM pm_checklist
     WHERE asset_type = ? AND LOWER(asset_category) = LOWER(?)
     LIMIT 1`,
    [assetType, category],
  );
  const id = headers[0]?.checklist_id;
  if (!id) return null;
  return getPmChecklistDetail(id);
}

export async function createPmChecklist(input: CreatePmChecklistInput): Promise<PmChecklistDetail> {
  const assetCategory = input.assetCategory.trim();
  const checklistName = input.checklistName.trim();
  if (!assetCategory) throw new Error('Asset category is required.');
  if (!checklistName) throw new Error('Checklist name is required.');

  const pool = getDbPool();
  const conn = await pool.getConnection();
  let checklistId = 0;
  try {
    await conn.beginTransaction();
    const [result] = await conn.execute<ResultSetHeader>(
      `INSERT INTO pm_checklist (asset_type, asset_category, checklist_name)
       VALUES (?, ?, ?)`,
      [input.assetType, assetCategory, checklistName],
    );
    checklistId = result.insertId;
    const items = (input.items ?? []).map((s) => s.trim()).filter(Boolean);
    for (const itemDescription of items) {
      await conn.execute(
        `INSERT INTO pm_checklist_item (checklist_id, item_description) VALUES (?, ?)`,
        [checklistId, itemDescription],
      );
    }
    await conn.commit();
  } catch (e) {
    await conn.rollback();
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes('uq_pm_checklist_type_category') || msg.includes('Duplicate')) {
      throw new Error('A checklist for this asset type and category already exists.');
    }
    throw e;
  } finally {
    conn.release();
  }

  const created = await getPmChecklistDetail(checklistId);
  if (!created) throw new Error('Checklist could not be created.');
  return created;
}

export async function updatePmChecklist(input: UpdatePmChecklistInput): Promise<void> {
  const assetCategory = input.assetCategory.trim();
  const checklistName = input.checklistName.trim();
  if (!assetCategory) throw new Error('Asset category is required.');
  if (!checklistName) throw new Error('Checklist name is required.');

  const pool = getDbPool();
  try {
    const [result] = await pool.execute<ResultSetHeader>(
      `UPDATE pm_checklist
       SET asset_category = ?, checklist_name = ?
       WHERE checklist_id = ?`,
      [assetCategory, checklistName, input.checklistId],
    );
    if (result.affectedRows === 0) throw new Error('Checklist not found.');
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes('uq_pm_checklist_type_category') || msg.includes('Duplicate')) {
      throw new Error('A checklist for this asset type and category already exists.');
    }
    throw e;
  }
}

export async function deletePmChecklist(checklistId: number): Promise<void> {
  const pool = getDbPool();
  const [used] = await pool.query<RowDataPacket[]>(
    `SELECT pm_log_id FROM pm_log WHERE checklist_id = ? LIMIT 1`,
    [checklistId],
  );
  if (used.length > 0) {
    throw new Error('This checklist is used in maintenance logs and cannot be deleted.');
  }
  const [result] = await pool.execute<ResultSetHeader>(
    `DELETE FROM pm_checklist WHERE checklist_id = ?`,
    [checklistId],
  );
  if (result.affectedRows === 0) throw new Error('Checklist not found.');
}

export async function addPmChecklistItem(input: AddPmChecklistItemInput): Promise<PmChecklistItem> {
  const itemDescription = input.itemDescription.trim();
  if (!itemDescription) throw new Error('Checklist item is required.');

  const pool = getDbPool();
  const [dup] = await pool.query<RowDataPacket[]>(
    `SELECT item_id FROM pm_checklist_item
     WHERE checklist_id = ? AND LOWER(item_description) = LOWER(?)
     LIMIT 1`,
    [input.checklistId, itemDescription],
  );
  if (dup.length > 0) throw new Error('That item already exists in this checklist.');

  const [result] = await pool.execute<ResultSetHeader>(
    `INSERT INTO pm_checklist_item (checklist_id, item_description) VALUES (?, ?)`,
    [input.checklistId, itemDescription],
  );
  return {
    itemId: result.insertId,
    checklistId: input.checklistId,
    itemDescription,
  };
}

export async function updatePmChecklistItem(input: UpdatePmChecklistItemInput): Promise<void> {
  const itemDescription = input.itemDescription.trim();
  if (!itemDescription) throw new Error('Checklist item is required.');

  const pool = getDbPool();
  const [rows] = await pool.query<(RowDataPacket & { checklist_id: number })[]>(
    `SELECT checklist_id FROM pm_checklist_item WHERE item_id = ? LIMIT 1`,
    [input.itemId],
  );
  const checklistId = rows[0]?.checklist_id;
  if (!checklistId) throw new Error('Checklist item not found.');

  const [dup] = await pool.query<RowDataPacket[]>(
    `SELECT item_id FROM pm_checklist_item
     WHERE checklist_id = ? AND item_id <> ? AND LOWER(item_description) = LOWER(?)
     LIMIT 1`,
    [checklistId, input.itemId, itemDescription],
  );
  if (dup.length > 0) throw new Error('That item already exists in this checklist.');

  await pool.execute(`UPDATE pm_checklist_item SET item_description = ? WHERE item_id = ?`, [
    itemDescription,
    input.itemId,
  ]);
}

export async function deletePmChecklistItem(itemId: number): Promise<void> {
  const pool = getDbPool();
  const [used] = await pool.query<RowDataPacket[]>(
    `SELECT pm_log_item_id FROM pm_log_item WHERE item_id = ? LIMIT 1`,
    [itemId],
  );
  if (used.length > 0) {
    throw new Error('This item is used in maintenance logs and cannot be deleted.');
  }
  const [result] = await pool.execute<ResultSetHeader>(
    `DELETE FROM pm_checklist_item WHERE item_id = ?`,
    [itemId],
  );
  if (result.affectedRows === 0) throw new Error('Checklist item not found.');
}

type PlaceRow = RowDataPacket & {
  asset_type: AssetKind;
  asset_id: number;
  category: string | null;
  brand: string | null;
  model: string | null;
  serial_num: string | null;
  building: string;
  level: string;
  zone: string;
};

async function listOpenPlaceAssets(): Promise<PlaceRow[]> {
  const pool = getDbPool();
  const [rows] = await pool.query<PlaceRow[]>(
    `SELECT 'av' AS asset_type, a.asset_id, a.category, a.brand, a.model, a.serial_num,
            d.building, d.level, d.zone
     FROM av_deployment d
     INNER JOIN (
       SELECT d2.asset_id, MAX(d2.deployment_id) AS deployment_id
       FROM av_deployment d2
       WHERE NOT EXISTS (
         SELECT 1 FROM av_return r WHERE r.deployment_id = d2.deployment_id
       )
       GROUP BY d2.asset_id
     ) open_d ON open_d.deployment_id = d.deployment_id
     INNER JOIN av a ON a.asset_id = d.asset_id
     WHERE TRIM(d.building) <> '' AND TRIM(d.level) <> '' AND TRIM(d.zone) <> ''

     UNION ALL

     SELECT 'network' AS asset_type, a.asset_id, a.category, a.brand, a.model, a.serial_num,
            d.building, d.level, d.zone
     FROM network_deployment d
     INNER JOIN (
       SELECT d2.asset_id, MAX(d2.deployment_id) AS deployment_id
       FROM network_deployment d2
       WHERE NOT EXISTS (
         SELECT 1 FROM network_return r WHERE r.deployment_id = d2.deployment_id
       )
       GROUP BY d2.asset_id
     ) open_d ON open_d.deployment_id = d.deployment_id
     INNER JOIN network a ON a.asset_id = d.asset_id
     WHERE TRIM(d.building) <> '' AND TRIM(d.level) <> '' AND TRIM(d.zone) <> ''

     UNION ALL

     SELECT 'laptop' AS asset_type, a.asset_id, a.category, a.brand, a.model, a.serial_num,
            h.building, h.level, h.zone
     FROM handover h
     LEFT JOIN handover_staff hs ON hs.handover_id = h.handover_id
     LEFT JOIN handover_return hr ON hr.handover_id = h.handover_id
     INNER JOIN (
       SELECT h2.asset_id, MAX(h2.handover_id) AS handover_id
       FROM handover h2
       LEFT JOIN handover_staff hs2 ON hs2.handover_id = h2.handover_id
       LEFT JOIN handover_return hr2 ON hr2.handover_id = h2.handover_id
       WHERE hs2.handover_staff_id IS NULL AND hr2.return_id IS NULL
       GROUP BY h2.asset_id
     ) open_p ON open_p.handover_id = h.handover_id AND open_p.asset_id = h.asset_id
     INNER JOIN laptop a ON a.asset_id = h.asset_id
     WHERE hs.handover_staff_id IS NULL AND hr.return_id IS NULL
       AND h.building IS NOT NULL AND TRIM(h.building) <> ''
       AND h.level IS NOT NULL AND TRIM(h.level) <> ''
       AND h.zone IS NOT NULL AND TRIM(h.zone) <> ''`,
  );
  return rows;
}

export async function getPmLocationTree(): Promise<PmLocationTree> {
  const rows = await listOpenPlaceAssets();
  const buildingSet = new Set<string>();
  const levelsByBuilding: Record<string, Set<string>> = {};
  const zonesByBuildingLevel: Record<string, Set<string>> = {};

  for (const row of rows) {
    const building = row.building.trim();
    const level = row.level.trim();
    const zone = row.zone.trim();
    buildingSet.add(building);
    if (!levelsByBuilding[building]) levelsByBuilding[building] = new Set();
    levelsByBuilding[building].add(level);
    const zk = placeKey(building, level);
    if (!zonesByBuildingLevel[zk]) zonesByBuildingLevel[zk] = new Set();
    zonesByBuildingLevel[zk].add(zone);
  }

  const buildings = [...buildingSet].sort((a, b) => a.localeCompare(b));
  return {
    buildings,
    levelsByBuilding: Object.fromEntries(
      Object.entries(levelsByBuilding).map(([b, set]) => [
        b,
        [...set].sort((a, b) => a.localeCompare(b)),
      ]),
    ),
    zonesByBuildingLevel: Object.fromEntries(
      Object.entries(zonesByBuildingLevel).map(([k, set]) => [
        k.replace('\0', '||'),
        [...set].sort((a, b) => a.localeCompare(b)),
      ]),
    ),
  };
}

export function pmZoneLookupKey(building: string, level: string) {
  return `${building}||${level}`;
}

export async function listPmAssetsAtPlace(input: {
  building: string;
  level: string;
  zone: string;
}): Promise<PmPlaceAsset[]> {
  const building = input.building.trim();
  const level = input.level.trim();
  const zone = input.zone.trim();
  if (!building || !level || !zone) return [];

  const rows = (await listOpenPlaceAssets()).filter(
    (r) =>
      r.building.trim() === building &&
      r.level.trim() === level &&
      r.zone.trim() === zone,
  );

  const pool = getDbPool();
  const [checklists] = await pool.query<
    (RowDataPacket & { checklist_id: number; asset_type: AssetKind; asset_category: string })[]
  >(`SELECT checklist_id, asset_type, asset_category FROM pm_checklist`);

  const checklistMap = new Map<string, number>();
  for (const c of checklists) {
    checklistMap.set(`${c.asset_type}:${c.asset_category.toLowerCase()}`, c.checklist_id);
  }

  return rows.map((r) => {
    const category = r.category?.trim() || null;
    const checklistId =
      category != null
        ? (checklistMap.get(`${r.asset_type}:${category.toLowerCase()}`) ?? null)
        : null;
    return {
      kind: r.asset_type,
      assetId: r.asset_id,
      category,
      brand: r.brand,
      model: r.model,
      serialNum: r.serial_num,
      building: r.building,
      level: r.level,
      zone: r.zone,
      checklistId,
    };
  });
}

export async function createPmLog(input: CreatePmLogInput): Promise<CreatePmLogResult> {
  if (!input.items.length) throw new Error('Complete at least one checklist item.');
  const pmDate = input.pmDate.trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(pmDate)) throw new Error('Maintenance date is required.');

  const performedBy = Number(input.performedBy);
  if (!Number.isFinite(performedBy) || performedBy <= 0) {
    throw new Error('Your technician session could not be verified. Sign out and sign in again.');
  }

  const results = input.items.map((i) => i.result);
  if (results.some((r) => r !== 'pass' && r !== 'fail' && r !== 'na')) {
    throw new Error('Invalid checklist result.');
  }
  const status = derivePmLogStatus(results);

  const detail = await getPmChecklistDetail(input.checklistId);
  if (!detail) throw new Error('Checklist not found.');
  if (detail.assetType !== input.assetType) {
    throw new Error('Checklist does not match this asset type.');
  }

  const requiredIds = new Set(detail.items.map((i) => i.itemId));
  const providedIds = new Set(input.items.map((i) => i.itemId));
  if (requiredIds.size !== providedIds.size || [...requiredIds].some((id) => !providedIds.has(id))) {
    throw new Error('Every checklist item must be marked before saving.');
  }

  const pool = getDbPool();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [logResult] = await conn.execute<ResultSetHeader>(
      `INSERT INTO pm_log
        (asset_id, asset_type, checklist_id, performed_by, pm_date, status, remarks)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        input.assetId,
        input.assetType,
        input.checklistId,
        performedBy,
        pmDate,
        status,
        input.remarks?.trim() || null,
      ],
    );
    const pmLogId = logResult.insertId;
    for (const item of input.items) {
      await conn.execute(
        `INSERT INTO pm_log_item (pm_log_id, item_id, result, remarks)
         VALUES (?, ?, ?, ?)`,
        [pmLogId, item.itemId, item.result, item.remarks?.trim() || null],
      );
    }
    await conn.commit();
    return { pmLogId, status };
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

type LogRow = RowDataPacket & {
  pm_log_id: number;
  pm_date: Date | string;
  asset_id: number;
  asset_type: AssetKind;
  checklist_id: number;
  checklist_name: string;
  status: PmLogStatus;
  remarks: string | null;
  performed_by: number;
  performed_email: string | null;
  item_count: number;
  fail_count: number;
  checked_count: number;
  laptop_category: string | null;
  laptop_brand: string | null;
  laptop_model: string | null;
  laptop_serial: string | null;
  av_category: string | null;
  av_brand: string | null;
  av_model: string | null;
  av_serial: string | null;
  network_category: string | null;
  network_brand: string | null;
  network_model: string | null;
  network_serial: string | null;
};

function mapLogRow(row: LogRow): PmLogListRow {
  const category =
    row.asset_type === 'laptop'
      ? row.laptop_category
      : row.asset_type === 'av'
        ? row.av_category
        : row.network_category;
  const brand =
    row.asset_type === 'laptop'
      ? row.laptop_brand
      : row.asset_type === 'av'
        ? row.av_brand
        : row.network_brand;
  const model =
    row.asset_type === 'laptop'
      ? row.laptop_model
      : row.asset_type === 'av'
        ? row.av_model
        : row.network_model;
  const serialNum =
    row.asset_type === 'laptop'
      ? row.laptop_serial
      : row.asset_type === 'av'
        ? row.av_serial
        : row.network_serial;
  const assetLabel = [brand, model].filter(Boolean).join(' ') || `Asset #${row.asset_id}`;
  const email = row.performed_email?.trim() || null;

  return {
    pmLogId: row.pm_log_id,
    pmDate: toIsoDate(row.pm_date),
    assetId: row.asset_id,
    assetType: row.asset_type,
    assetCategory: category,
    assetLabel,
    serialNum,
    checklistId: row.checklist_id,
    checklistName: row.checklist_name,
    status: row.status,
    remarks: row.remarks,
    performedBy: email ?? `User #${row.performed_by}`,
    performedByEmail: email,
    itemsChecked: Number(row.checked_count) || 0,
    itemsTotal: Number(row.item_count) || 0,
    failCount: Number(row.fail_count) || 0,
  };
}

export async function listPmLogs(filters: PmLogListFilters = {}): Promise<PmLogListRow[]> {
  const pool = getDbPool();
  const where: string[] = ['1=1'];
  const params: unknown[] = [];

  if (filters.dateFrom?.trim()) {
    where.push('l.pm_date >= ?');
    params.push(filters.dateFrom.trim().slice(0, 10));
  }
  if (filters.dateTo?.trim()) {
    where.push('l.pm_date <= ?');
    params.push(filters.dateTo.trim().slice(0, 10));
  }
  if (filters.status && filters.status !== 'all') {
    where.push('l.status = ?');
    params.push(filters.status);
  }
  if (filters.assetType && filters.assetType !== 'all') {
    where.push('l.asset_type = ?');
    params.push(filters.assetType);
  }

  const [rows] = await pool.query<LogRow[]>(
    `SELECT l.pm_log_id, l.pm_date, l.asset_id, l.asset_type, l.checklist_id, l.status, l.remarks,
            l.performed_by, c.checklist_name, u.email AS performed_email,
            COUNT(li.pm_log_item_id) AS item_count,
            SUM(CASE WHEN li.result = 'fail' THEN 1 ELSE 0 END) AS fail_count,
            SUM(CASE WHEN li.result IN ('pass','fail','na') THEN 1 ELSE 0 END) AS checked_count,
            lap.category AS laptop_category, lap.brand AS laptop_brand, lap.model AS laptop_model,
            lap.serial_num AS laptop_serial,
            av.category AS av_category, av.brand AS av_brand, av.model AS av_model,
            av.serial_num AS av_serial,
            net.category AS network_category, net.brand AS network_brand, net.model AS network_model,
            net.serial_num AS network_serial
     FROM pm_log l
     INNER JOIN pm_checklist c ON c.checklist_id = l.checklist_id
     INNER JOIN users u ON u.id = l.performed_by
     LEFT JOIN pm_log_item li ON li.pm_log_id = l.pm_log_id
     LEFT JOIN laptop lap ON l.asset_type = 'laptop' AND lap.asset_id = l.asset_id
     LEFT JOIN av ON l.asset_type = 'av' AND av.asset_id = l.asset_id
     LEFT JOIN network net ON l.asset_type = 'network' AND net.asset_id = l.asset_id
     WHERE ${where.join(' AND ')}
     GROUP BY l.pm_log_id, l.pm_date, l.asset_id, l.asset_type, l.checklist_id, l.status, l.remarks,
              l.performed_by, c.checklist_name, u.email,
              lap.category, lap.brand, lap.model, lap.serial_num,
              av.category, av.brand, av.model, av.serial_num,
              net.category, net.brand, net.model, net.serial_num
     ORDER BY l.pm_date DESC, l.pm_log_id DESC`,
    params,
  );

  let mapped = rows.map(mapLogRow);

  if (filters.assetCategory && filters.assetCategory !== 'all') {
    const cat = filters.assetCategory.toLowerCase();
    mapped = mapped.filter((r) => (r.assetCategory ?? '').toLowerCase() === cat);
  }

  const q = filters.search?.trim().toLowerCase();
  if (q) {
    mapped = mapped.filter((r) =>
      [
        r.assetLabel,
        r.serialNum,
        r.assetCategory,
        r.checklistName,
        r.performedBy,
        r.performedByEmail,
        String(r.assetId),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(q),
    );
  }

  return mapped;
}

export async function getPmStats(): Promise<PmStats> {
  const { from, to } = monthBounds();
  const pool = getDbPool();
  const [rows] = await pool.query<
    (RowDataPacket & {
      this_month: number;
      passed: number;
      issues: number;
      assets_covered: number;
    })[]
  >(
    `SELECT
       COUNT(*) AS this_month,
       SUM(CASE WHEN status = 'passed' THEN 1 ELSE 0 END) AS passed,
       SUM(CASE WHEN status IN ('failed','partial') THEN 1 ELSE 0 END) AS issues,
       COUNT(DISTINCT CONCAT(asset_type, ':', asset_id)) AS assets_covered
     FROM pm_log
     WHERE pm_date BETWEEN ? AND ?`,
    [from, to],
  );
  const row = rows[0];
  return {
    thisMonth: Number(row?.this_month) || 0,
    passed: Number(row?.passed) || 0,
    issues: Number(row?.issues) || 0,
    assetsCovered: Number(row?.assets_covered) || 0,
  };
}
