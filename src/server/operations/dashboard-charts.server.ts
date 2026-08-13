import type { RowDataPacket } from 'mysql2';
import type {
  DashboardInventorySlice,
  DashboardProgramStackPoint,
  DashboardTrendPoint,
  TechnicianDashboardCharts,
} from '@/lib/dashboard-schema';
import { getDbPool } from '@/server/db';

function formatDate(val: Date | string | null | undefined): string {
  if (val == null) return '';
  if (val instanceof Date) return val.toISOString().slice(0, 10);
  return String(val).slice(0, 10);
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

export async function loadDashboardCharts(
  pool: ReturnType<typeof getDbPool>,
  periodDays = 14,
): Promise<TechnicianDashboardCharts> {
  const trendDays = lastNDaysIso(periodDays);
  const sparkDays = lastNDaysIso(Math.min(periodDays, 7));
  const rangeStart = trendDays[0];
  const rangeEnd = trendDays[trendDays.length - 1];

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
    [rangeStart, rangeEnd],
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
      // In stock: new (1), return (2), assign (4)
      if (id === 1 || id === 2 || id === 4) active += c;
      else if (id === 3) deploy += c;
      // Request flow: active / booked / checkout (request)
      else if (id === 6 || id === 7 || id === 8) requestFlow += c;
      // Disposed (5) and anything else
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
