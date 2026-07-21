import type { RowDataPacket } from 'mysql2';
import {
  DASHBOARD_ASSET_DEPLOY_STATUS_IDS,
  DASHBOARD_ASSET_STATUS_IDS,
  DASHBOARD_ASSET_STORE_STATUS_IDS,
  DASHBOARD_REQUEST_STATUS_IDS,
  DASHBOARD_REQUEST_WORKFLOW_KEYS,
  type DashboardAssetKindStats,
  type DashboardRequestStats,
  type DashboardRequestStatus,
  type DashboardRequestWorkflowKey,
  type DashboardTimetableEntry,
  type TechnicianDashboardData,
  type TechnicianDashboardStats,
} from '@/lib/dashboard-schema';
import type { RequestItemRow } from '@/lib/request-schema';
import { REQUEST_STATUS_ACTIVE } from '@/lib/request-schema';
import { STAFF_DIVISIONS } from '@/lib/staff-schema';
import { attachDisplayNames } from '@/server/azure-directory.server';
import { getDbPool } from '@/server/db';

function formatDate(val: Date | string | null | undefined): string {
  if (val == null) return '';
  if (val instanceof Date) return val.toISOString().slice(0, 10);
  return String(val).slice(0, 10);
}

function addDaysIso(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + days);
  return formatDate(date);
}

/** Monday of the week containing `anchor` (local), plus `weekOffset` weeks. */
export function weekRange(anchor: Date, weekOffset = 0): { start: string; end: string } {
  const d = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate());
  const day = d.getDay();
  const toMonday = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + toMonday + weekOffset * 7);
  const start = formatDate(d);
  const end = addDaysIso(start, 6);
  return { start, end };
}

export type DashboardCalendarMonth = { year: number; month: number };

/** First and last ISO date of a calendar month (month is 1–12). */
export function monthRange(year: number, month: number): { start: string; end: string } {
  const start = formatDate(new Date(year, month - 1, 1));
  const end = formatDate(new Date(year, month, 0));
  return { start, end };
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

function computeRequestStatus(
  items: RequestItemRow[],
  assignments: {
    checkout_at: Date | string | null;
    assigned_at: Date | string | null;
    unavailable_at: Date | string | null;
    asset_id: number | null;
  }[],
  returnDate: string,
): DashboardRequestStatus {
  const today = formatDate(new Date());
  const checkedOut = assignments.filter((a) => a.checkout_at != null).length;
  if (checkedOut > 0) {
    if (returnDate <= today) return 'due_return';
    return 'in_use';
  }
  const booked = assignments.filter(
    (a) => a.assigned_at != null && a.asset_id != null && a.checkout_at == null,
  ).length;
  const totalQty = items.reduce((n, i) => n + i.quantity, 0);
  if (booked > 0 && booked >= totalQty) return 'checkout';
  return 'preparing';
}

const ASSET_STORE_STATUS_IDS = new Set<number>(DASHBOARD_ASSET_STORE_STATUS_IDS);
const ASSET_DEPLOY_STATUS_IDS = new Set<number>(DASHBOARD_ASSET_DEPLOY_STATUS_IDS);
const REQUEST_STATUS_IDS = new Set<number>(DASHBOARD_REQUEST_STATUS_IDS);

async function loadLaptopDeployDivisionCounts(
  pool: ReturnType<typeof getDbPool>,
): Promise<{ division: string; count: number }[]> {
  const [rows] = await pool.query<(RowDataPacket & { division: string | null; cnt: number })[]>(
    `SELECT ho.recipient_division AS division, COUNT(*) AS cnt
     FROM laptop l
     INNER JOIN (
       SELECT h.asset_id, s.division AS recipient_division
       FROM handover h
       INNER JOIN handover_staff hs ON hs.handover_id = h.handover_id
       INNER JOIN staff s ON s.employee_no = hs.employee_no
       LEFT JOIN handover_return hr ON hr.handover_staff_id = hs.handover_staff_id
       INNER JOIN (
         SELECT h2.asset_id, MAX(h2.handover_id) AS handover_id
         FROM handover h2
         INNER JOIN handover_staff hs2 ON hs2.handover_id = h2.handover_id
         LEFT JOIN handover_return hr2 ON hr2.handover_staff_id = hs2.handover_staff_id
         WHERE hr2.return_id IS NULL
         GROUP BY h2.asset_id
       ) open_h ON open_h.handover_id = h.handover_id AND open_h.asset_id = h.asset_id
       WHERE hr.return_id IS NULL
     ) ho ON ho.asset_id = l.asset_id
     WHERE l.status_id IN (${DASHBOARD_ASSET_DEPLOY_STATUS_IDS.join(',')})
     GROUP BY ho.recipient_division`,
  );

  const countByDivision = new Map<string, number>();
  for (const row of rows) {
    const division = row.division?.trim();
    if (!division) continue;
    countByDivision.set(division, (countByDivision.get(division) ?? 0) + Number(row.cnt));
  }

  return STAFF_DIVISIONS.map((division) => ({
    division,
    count: countByDivision.get(division) ?? 0,
  }));
}

async function loadPlaceDeployBuildingCounts(
  pool: ReturnType<typeof getDbPool>,
  kind: 'av' | 'network',
): Promise<{ building: string; count: number }[]> {
  const deployTable = kind === 'av' ? 'av_deployment' : 'network_deployment';
  const returnTable = kind === 'av' ? 'av_return' : 'network_return';

  const [rows] = await pool.query<(RowDataPacket & { building: string | null; cnt: number })[]>(
    `SELECT d.building AS building, COUNT(*) AS cnt
     FROM \`${deployTable}\` d
     INNER JOIN (
       SELECT d2.asset_id, MAX(d2.deployment_id) AS deployment_id
       FROM \`${deployTable}\` d2
       WHERE NOT EXISTS (
         SELECT 1 FROM \`${returnTable}\` r WHERE r.deployment_id = d2.deployment_id
       )
       GROUP BY d2.asset_id
     ) open_d ON open_d.deployment_id = d.deployment_id
     GROUP BY d.building`,
  );

  const countByBuilding = new Map<string, number>();
  for (const row of rows) {
    const building = row.building?.trim();
    if (!building) continue;
    countByBuilding.set(building, (countByBuilding.get(building) ?? 0) + Number(row.cnt));
  }

  return [...countByBuilding.entries()]
    .map(([building, count]) => ({ building, count }))
    .sort((a, b) => b.count - a.count || a.building.localeCompare(b.building));
}

async function loadAssetKindStats(
  pool: ReturnType<typeof getDbPool>,
  table: 'laptop' | 'av' | 'network',
): Promise<DashboardAssetKindStats> {
  const [rows] = await pool.query<(RowDataPacket & { status_id: number; cnt: number })[]>(
    `SELECT status_id, COUNT(*) AS cnt FROM \`${table}\` GROUP BY status_id`,
  );

  const countByStatus = new Map<number, number>();
  let store = 0;
  let deploy = 0;
  let total = 0;
  let registeredTotal = 0;

  for (const row of rows) {
    const statusId = Number(row.status_id);
    const count = Number(row.cnt);
    registeredTotal += count;
    if (REQUEST_STATUS_IDS.has(statusId)) continue;

    countByStatus.set(statusId, count);
    total += count;
    if (ASSET_STORE_STATUS_IDS.has(statusId)) store += count;
    if (ASSET_DEPLOY_STATUS_IDS.has(statusId)) deploy += count;
  }

  const byStatus = DASHBOARD_ASSET_STATUS_IDS.map((statusId) => ({
    statusId,
    count: countByStatus.get(statusId) ?? 0,
  })).filter((status) => status.count > 0);

  return { store, deploy, total, registeredTotal, byStatus };
}

function isRequestCompleted(
  items: RequestItemRow[],
  openAssignmentCount: number,
  returnedByItem: Map<number, number>,
): boolean {
  const totalReturned = items.every((item) => (returnedByItem.get(item.requestItemId) ?? 0) >= item.quantity);
  return totalReturned && openAssignmentCount === 0;
}

async function loadRequestStats(pool: ReturnType<typeof getDbPool>): Promise<DashboardRequestStats> {
  const workflowCounts = new Map<DashboardRequestWorkflowKey, number>(
    DASHBOARD_REQUEST_WORKFLOW_KEYS.map((key) => [key, 0]),
  );

  const [headers] = await pool.query<(RowDataPacket & { request_id: number; return_date: Date | string })[]>(
    `SELECT request_id, return_date FROM request WHERE rejected_at IS NULL`,
  );

  for (const header of headers) {
    const [items] = await pool.query<
      (RowDataPacket & { request_item_id: number; asset_type: string; quantity: number })[]
    >(`SELECT request_item_id, asset_type, quantity FROM request_item WHERE request_id = ?`, [
      header.request_id,
    ]);

    const [returnedRows] = await pool.query<
      (RowDataPacket & { request_item_id: number; cnt: number })[]
    >(
      `SELECT request_item_id, COUNT(*) AS cnt
       FROM request_assignment
       WHERE request_id = ? AND returned_at IS NOT NULL AND request_item_id IS NOT NULL
       GROUP BY request_item_id`,
      [header.request_id],
    );
    const returnedByItem = new Map(returnedRows.map((row) => [row.request_item_id, Number(row.cnt)]));

    const itemRows: RequestItemRow[] = items.map((item) => ({
      requestItemId: item.request_item_id,
      assetType: item.asset_type,
      quantity: item.quantity,
      returnedCount: returnedByItem.get(item.request_item_id) ?? 0,
    }));

    const [assignments] = await pool.query<
      (RowDataPacket & {
        checkout_at: Date | string | null;
        assigned_at: Date | string | null;
        unavailable_at: Date | string | null;
        asset_id: number | null;
      })[]
    >(
      `SELECT checkout_at, assigned_at, unavailable_at, asset_id
       FROM request_assignment
       WHERE request_id = ? AND returned_at IS NULL`,
      [header.request_id],
    );

    if (isRequestCompleted(itemRows, assignments.length, returnedByItem)) {
      workflowCounts.set('completed', (workflowCounts.get('completed') ?? 0) + 1);
      continue;
    }

    const status = computeRequestStatus(itemRows, assignments, formatDate(header.return_date));
    workflowCounts.set(status, (workflowCounts.get(status) ?? 0) + 1);
  }

  const poolByKind: DashboardRequestStats['poolByKind'] = [];
  for (const { kind, table } of [
    { kind: 'laptop' as const, table: 'laptop' },
    { kind: 'av' as const, table: 'av' },
    { kind: 'network' as const, table: 'network' },
  ]) {
    const [rows] = await pool.query<(RowDataPacket & { cnt: number })[]>(
      `SELECT COUNT(*) AS cnt FROM \`${table}\` WHERE status_id = ?`,
      [REQUEST_STATUS_ACTIVE],
    );
    poolByKind.push({ kind, count: Number(rows[0]?.cnt ?? 0) });
  }

  const byWorkflow = DASHBOARD_REQUEST_WORKFLOW_KEYS.map((key) => ({
    key,
    count: workflowCounts.get(key) ?? 0,
  }));
  const total = byWorkflow
    .filter((row) => row.key !== 'completed')
    .reduce((sum, row) => sum + row.count, 0);

  return { total, byWorkflow, poolByKind };
}

export async function getTechnicianDashboard(
  calendar: DashboardCalendarMonth,
): Promise<TechnicianDashboardData> {
  const pool = getDbPool();
  const { start: weekStart, end: weekEnd } = monthRange(calendar.year, calendar.month);

  const [
    laptop,
    av,
    network,
    totalRequest,
    laptopDeployByDivision,
    avDeployByBuilding,
    networkDeployByBuilding,
  ] = await Promise.all([
    loadAssetKindStats(pool, 'laptop'),
    loadAssetKindStats(pool, 'av'),
    loadAssetKindStats(pool, 'network'),
    loadRequestStats(pool),
    loadLaptopDeployDivisionCounts(pool),
    loadPlaceDeployBuildingCounts(pool, 'av'),
    loadPlaceDeployBuildingCounts(pool, 'network'),
  ]);
  laptop.deployByDivision = laptopDeployByDivision;
  av.deployByBuilding = avDeployByBuilding;
  network.deployByBuilding = networkDeployByBuilding;
  const requestPoolCount =
    (totalRequest.poolByKind.find((item) => item.kind === 'laptop')?.count ?? 0) +
    (totalRequest.poolByKind.find((item) => item.kind === 'av')?.count ?? 0);
  const stats: TechnicianDashboardStats = {
    laptop,
    av,
    network,
    totalRequest,
    requestPoolCount,
    laptopCount: laptop.registeredTotal,
    avCount: av.registeredTotal,
    networkCount: network.registeredTotal,
  };

  const [headers] = await pool.query<
    (RowDataPacket & {
      request_id: number;
      requester_oid: string | null;
      requester_name: string;
      borrow_date: Date | string;
      return_date: Date | string;
      program_type: string;
      usage_location: string;
    })[]
  >(
    `SELECT r.request_id, u.oid AS requester_oid,
            r.borrow_date, r.return_date, r.program_type, r.usage_location
     FROM request r
     INNER JOIN users u ON u.id = r.requested_by
     WHERE r.rejected_at IS NULL
       AND r.borrow_date <= ?
       AND r.return_date >= ?
     ORDER BY r.borrow_date ASC, r.request_id ASC`,
    [weekEnd, weekStart],
  );
  await attachDisplayNames(headers, 'requester_oid', 'requester_name');

  const timetable: DashboardTimetableEntry[] = [];

  for (const h of headers) {
    const [items] = await pool.query<
      (RowDataPacket & { request_item_id: number; asset_type: string; quantity: number })[]
    >(`SELECT request_item_id, asset_type, quantity FROM request_item WHERE request_id = ?`, [
      h.request_id,
    ]);

    const [returnedRows] = await pool.query<
      (RowDataPacket & { request_item_id: number; cnt: number })[]
    >(
      `SELECT request_item_id, COUNT(*) AS cnt
       FROM request_assignment
       WHERE request_id = ? AND returned_at IS NOT NULL AND request_item_id IS NOT NULL
       GROUP BY request_item_id`,
      [h.request_id],
    );
    const returnedByItem = new Map(returnedRows.map((r) => [r.request_item_id, Number(r.cnt)]));

    const itemRows: RequestItemRow[] = items.map((i) => ({
      requestItemId: i.request_item_id,
      assetType: i.asset_type,
      quantity: i.quantity,
      returnedCount: returnedByItem.get(i.request_item_id) ?? 0,
    }));

    const [assignments] = await pool.query<
      (RowDataPacket & {
        checkout_at: Date | string | null;
        assigned_at: Date | string | null;
        unavailable_at: Date | string | null;
        asset_id: number | null;
      })[]
    >(
      `SELECT checkout_at, assigned_at, unavailable_at, asset_id
       FROM request_assignment
       WHERE request_id = ? AND returned_at IS NULL`,
      [h.request_id],
    );

    const totalReturned = itemRows.every((i) => (returnedByItem.get(i.requestItemId) ?? 0) >= i.quantity);
    if (totalReturned && assignments.length === 0) continue;

    const needsAction = requestNeedsTechnicianWork(itemRows, assignments.length, returnedByItem);

    const borrowDate = formatDate(h.borrow_date);
    const returnDate = formatDate(h.return_date);
    const itemSummary = itemRows.map((i) => `${i.assetType} ×${i.quantity}`).join(', ');

    timetable.push({
      requestId: h.request_id,
      requesterName: h.requester_name,
      borrowDate,
      returnDate,
      programType: h.program_type,
      usageLocation: h.usage_location,
      itemSummary,
      totalQty: itemRows.reduce((n, i) => n + i.quantity, 0),
      status: computeRequestStatus(itemRows, assignments, returnDate),
      needsAction,
    });
  }

  return {
    stats,
    timetable,
    weekStart,
    weekEnd,
    charts: {
      requestTrend: [],
      requestsByProgram: [],
      programKeys: [],
      inventoryMix: [],
      sparklines: { pending: [], checkout: [], onLoan: [], pool: [] },
    },
  };
}
