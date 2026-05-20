import type { RowDataPacket } from 'mysql2';
import type {
  DashboardInventorySlice,
  DashboardProgramStackPoint,
  DashboardRequestStatus,
  DashboardTimetableEntry,
  DashboardTrendPoint,
  TechnicianDashboardCharts,
  TechnicianDashboardData,
  TechnicianDashboardStats,
} from '@/lib/dashboard-schema';
import type { RequestItemRow } from '@/lib/request-schema';
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

function lastNDaysIso(n: number): string[] {
  const days: string[] = [];
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  for (let i = n - 1; i >= 0; i--) {
    const copy = new Date(d);
    copy.setDate(copy.getDate() - i);
    days.push(formatDate(copy));
  }
  return days;
}

function shortDayLabel(iso: string): string {
  const [y, m, day] = iso.split('-').map(Number);
  const d = new Date(y, m - 1, day);
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

async function loadDashboardCharts(pool: ReturnType<typeof getDbPool>): Promise<TechnicianDashboardCharts> {
  const trendDays = lastNDaysIso(14);
  const sparkDays = lastNDaysIso(7);
  const rangeStart = trendDays[0];

  const [submittedRows] = await pool.query<(RowDataPacket & { d: Date | string; cnt: number })[]>(
    `SELECT DATE(created_at) AS d, COUNT(*) AS cnt
     FROM request
     WHERE created_at >= ?
     GROUP BY DATE(created_at)`,
    [rangeStart],
  );
  const submittedMap = new Map(submittedRows.map((r) => [formatDate(r.d), Number(r.cnt)]));

  const [dueRows] = await pool.query<(RowDataPacket & { d: Date | string; cnt: number })[]>(
    `SELECT return_date AS d, COUNT(*) AS cnt
     FROM request
     WHERE rejected_at IS NULL AND return_date >= ? AND return_date <= ?
     GROUP BY return_date`,
    [rangeStart, trendDays[trendDays.length - 1]],
  );
  const dueMap = new Map(dueRows.map((r) => [formatDate(r.d), Number(r.cnt)]));

  const requestTrend: DashboardTrendPoint[] = trendDays.map((iso) => ({
    iso,
    label: shortDayLabel(iso),
    submitted: submittedMap.get(iso) ?? 0,
    dueReturn: dueMap.get(iso) ?? 0,
  }));

  const [programRows] = await pool.query<
    (RowDataPacket & { d: Date | string; program_type: string; cnt: number })[]
  >(
    `SELECT DATE(created_at) AS d, program_type, COUNT(*) AS cnt
     FROM request
     WHERE created_at >= ? AND rejected_at IS NULL
     GROUP BY DATE(created_at), program_type`,
    [sparkDays[0]],
  );

  const programKeys = [...new Set(programRows.map((r) => r.program_type))].sort();
  const programByDay = new Map<string, DashboardProgramStackPoint>();
  for (const iso of sparkDays) {
    programByDay.set(iso, { iso, label: shortDayLabel(iso) });
  }
  for (const row of programRows) {
    const iso = formatDate(row.d);
    const point = programByDay.get(iso);
    if (point) point[row.program_type] = Number(row.cnt);
  }
  for (const key of programKeys) {
    for (const point of programByDay.values()) {
      if (point[key] == null) point[key] = 0;
    }
  }
  const requestsByProgram = sparkDays.map((iso) => programByDay.get(iso)!);

  const [checkoutSpark] = await pool.query<(RowDataPacket & { d: Date | string; cnt: number })[]>(
    `SELECT DATE(checkout_at) AS d, COUNT(*) AS cnt
     FROM request_assignment
     WHERE checkout_at >= ?
     GROUP BY DATE(checkout_at)`,
    [sparkDays[0]],
  );
  const checkoutMap = new Map(checkoutSpark.map((r) => [formatDate(r.d), Number(r.cnt)]));

  const [bookedSpark] = await pool.query<(RowDataPacket & { d: Date | string; cnt: number })[]>(
    `SELECT DATE(assigned_at) AS d, COUNT(*) AS cnt
     FROM request_assignment
     WHERE assigned_at >= ?
     GROUP BY DATE(assigned_at)`,
    [sparkDays[0]],
  );
  const bookedMap = new Map(bookedSpark.map((r) => [formatDate(r.d), Number(r.cnt)]));

  async function statusCounts(table: string): Promise<DashboardInventorySlice> {
    const [rows] = await pool.query<(RowDataPacket & { status_id: number; cnt: number })[]>(
      `SELECT status_id, COUNT(*) AS cnt FROM \`${table}\` GROUP BY status_id`,
    );
    let active = 0;
    let deploy = 0;
    let requestFlow = 0;
    let maintenance = 0;
    for (const r of rows) {
      const id = Number(r.status_id);
      const c = Number(r.cnt);
      if (id === 1 || id === 7) active += c;
      else if (id === 3) deploy += c;
      else if (id === 9 || id === 10 || id === 11) requestFlow += c;
      else if (id === 4 || id === 2 || id === 8) maintenance += c;
      else maintenance += c;
    }
    const kind = table === 'laptop' ? 'Laptop' : table === 'av' ? 'AV' : 'Network';
    return { kind, active, deploy, requestFlow, maintenance };
  }

  const inventoryMix = await Promise.all([
    statusCounts('laptop'),
    statusCounts('av'),
    statusCounts('network'),
  ]);

  return {
    requestTrend,
    requestsByProgram,
    programKeys,
    inventoryMix,
    sparklines: {
      pending: sparkDays.map((iso) => submittedMap.get(iso) ?? 0),
      checkout: sparkDays.map((iso) => checkoutMap.get(iso) ?? 0),
      onLoan: sparkDays.map((iso) => dueMap.get(iso) ?? 0),
      pool: sparkDays.map((iso) => bookedMap.get(iso) ?? 0),
    },
  };
}

export async function getTechnicianDashboard(weekOffset = 0): Promise<TechnicianDashboardData> {
  const pool = getDbPool();
  const { start: weekStart, end: weekEnd } = weekRange(new Date(), weekOffset);
  const charts = await loadDashboardCharts(pool);

  const [statRows] = await pool.query<
    (RowDataPacket & {
      pool_laptop: number;
      pool_av: number;
      laptop_total: number;
      av_total: number;
      network_total: number;
      checked_out: number;
    })[]
  >(
    `SELECT
      (SELECT COUNT(*) FROM laptop WHERE status_id = 9) AS pool_laptop,
      (SELECT COUNT(*) FROM av WHERE status_id = 9) AS pool_av,
      (SELECT COUNT(*) FROM laptop) AS laptop_total,
      (SELECT COUNT(*) FROM av) AS av_total,
      (SELECT COUNT(*) FROM network) AS network_total,
      (SELECT COUNT(*) FROM request_assignment ra
       INNER JOIN request r ON r.request_id = ra.request_id
       WHERE ra.checkout_at IS NOT NULL AND ra.returned_at IS NULL AND r.rejected_at IS NULL) AS checked_out`,
  );
  const statRow = statRows[0];
  const stats: TechnicianDashboardStats = {
    pendingRequests: 0,
    awaitingCheckout: 0,
    checkedOut: Number(statRow?.checked_out ?? 0),
    requestPoolCount: Number(statRow?.pool_laptop ?? 0) + Number(statRow?.pool_av ?? 0),
    laptopCount: Number(statRow?.laptop_total ?? 0),
    avCount: Number(statRow?.av_total ?? 0),
    networkCount: Number(statRow?.network_total ?? 0),
  };

  const [headers] = await pool.query<
    (RowDataPacket & {
      request_id: number;
      requester_name: string;
      borrow_date: Date | string;
      return_date: Date | string;
      program_type: string;
      usage_location: string;
    })[]
  >(
    `SELECT r.request_id, u.full_name AS requester_name,
            r.borrow_date, r.return_date, r.program_type, r.usage_location
     FROM request r
     INNER JOIN users u ON u.staff_id = r.requested_by
     WHERE r.rejected_at IS NULL
       AND r.borrow_date <= ?
       AND r.return_date >= ?
     ORDER BY r.borrow_date ASC, r.request_id ASC`,
    [weekEnd, weekStart],
  );

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
    if (needsAction) stats.pendingRequests++;

    const awaitingCheckout = assignments.filter(
      (a) =>
        a.assigned_at != null &&
        a.asset_id != null &&
        a.checkout_at == null &&
        a.unavailable_at == null,
    ).length;
    stats.awaitingCheckout += awaitingCheckout;

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

  return { stats, timetable, weekStart, weekEnd, charts };
}
