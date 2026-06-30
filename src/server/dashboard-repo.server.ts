import type { RowDataPacket } from 'mysql2';
import type {
  DashboardRequestStatus,
  DashboardTimetableEntry,
  TechnicianDashboardData,
  TechnicianDashboardStats,
} from '@/lib/dashboard-schema';
import type { RequestItemRow } from '@/lib/request-schema';
import { REQUEST_STATUS_ACTIVE } from '@/lib/request-schema';
import { attachDisplayNames } from '@/server/azure-directory.server';
import { getDbPool } from '@/server/db';
import { loadDashboardCharts } from '@/server/dashboard-charts.server';

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

export async function getTechnicianDashboard(
  calendar: DashboardCalendarMonth,
): Promise<TechnicianDashboardData> {
  const pool = getDbPool();
  const { start: weekStart, end: weekEnd } = monthRange(calendar.year, calendar.month);
  const charts = await loadDashboardCharts(pool, 14);

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
      (SELECT COUNT(*) FROM laptop WHERE status_id = ${REQUEST_STATUS_ACTIVE}) AS pool_laptop,
      (SELECT COUNT(*) FROM av WHERE status_id = ${REQUEST_STATUS_ACTIVE}) AS pool_av,
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
