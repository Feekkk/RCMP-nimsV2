import type { RowDataPacket } from 'mysql2';
import type {
  AdminDashboardData,
  AdminDashboardStats,
  AdminPeriodDays,
  LifecycleSnapshot,
  RecentRejectionRow,
  RoleCountSlice,
  TopRequesterRow,
} from '@/lib/admin-dashboard-schema';
import { ROLE_USER } from '@/lib/auth-session';
import { attachDisplayNames } from '@/server/azure-directory.server';
import { getDbPool } from '@/server/db';
import { loadDashboardCharts } from '@/server/dashboard-charts.server';

function formatDate(val: Date | string | null | undefined): string {
  if (val == null) return '';
  if (val instanceof Date) return val.toISOString().slice(0, 10);
  return String(val).slice(0, 10);
}

function formatDateTime(val: Date | string | null | undefined): string {
  if (val == null) return '';
  if (val instanceof Date) return val.toISOString().slice(0, 16).replace('T', ' ');
  return String(val).slice(0, 16);
}

function periodStartIso(periodDays: AdminPeriodDays): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - (periodDays - 1));
  return formatDate(d);
}

export async function getAdminDashboard(periodDays: AdminPeriodDays): Promise<AdminDashboardData> {
  const pool = getDbPool();
  const rangeStart = periodStartIso(periodDays);
  const charts = await loadDashboardCharts(pool, periodDays);

  const [statRows] = await pool.query<
    (RowDataPacket & {
      laptop_total: number;
      av_total: number;
      network_total: number;
      registered_users: number;
      requests_in_period: number;
      checked_out: number;
    })[]
  >(
    `SELECT
      (SELECT COUNT(*) FROM laptop) AS laptop_total,
      (SELECT COUNT(*) FROM av) AS av_total,
      (SELECT COUNT(*) FROM network) AS network_total,
      (SELECT COUNT(*) FROM users WHERE role_id = ?) AS registered_users,
      (SELECT COUNT(*) FROM request
       WHERE rejected_at IS NULL AND created_at >= ?) AS requests_in_period,
      (SELECT COUNT(*) FROM request_assignment ra
       INNER JOIN request r ON r.request_id = ra.request_id
       WHERE ra.checkout_at IS NOT NULL AND ra.returned_at IS NULL AND r.rejected_at IS NULL) AS checked_out`,
    [ROLE_USER, rangeStart],
  );
  const statRow = statRows[0];
  const stats: AdminDashboardStats = {
    totalAssets:
      Number(statRow?.laptop_total ?? 0) +
      Number(statRow?.av_total ?? 0) +
      Number(statRow?.network_total ?? 0),
    registeredUsers: Number(statRow?.registered_users ?? 0),
    requestsInPeriod: Number(statRow?.requests_in_period ?? 0),
    onLoanNow: Number(statRow?.checked_out ?? 0),
  };

  const [roleRows] = await pool.query<(RowDataPacket & { role_name: string; cnt: number })[]>(
    `SELECT r.name AS role_name, COUNT(*) AS cnt
     FROM users u
     INNER JOIN role r ON r.id = u.role_id
     GROUP BY r.name
     ORDER BY r.name`,
  );
  const usersByRole: RoleCountSlice[] = roleRows.map((r) => ({
    roleName: r.role_name,
    count: Number(r.cnt),
  }));

  const [topRows] = await pool.query<
    (RowDataPacket & { id: number; oid: string | null; full_name: string; cnt: number })[]
  >(
    `SELECT u.id, u.oid, COUNT(*) AS cnt
     FROM request r
     INNER JOIN users u ON u.id = r.requested_by
     WHERE r.created_at >= ?
     GROUP BY u.id, u.oid
     ORDER BY cnt DESC
     LIMIT 10`,
    [rangeStart],
  );
  await attachDisplayNames(topRows, 'oid', 'full_name');
  const topRequesters: TopRequesterRow[] = topRows.map((r) => ({
    staffId: String(r.id),
    fullName: r.full_name,
    requestCount: Number(r.cnt),
  }));

  const [rejectRows] = await pool.query<
    (RowDataPacket & {
      request_id: number;
      rejected_at: Date | string;
      requester_oid: string | null;
      requester_name: string;
      program_type: string;
      rejection_reason: string | null;
    })[]
  >(
    `SELECT r.request_id, r.rejected_at, u.oid AS requester_oid,
            r.program_type, r.rejection_reason
     FROM request r
     INNER JOIN users u ON u.id = r.requested_by
     WHERE r.rejected_at IS NOT NULL
     ORDER BY r.rejected_at DESC
     LIMIT 10`,
  );
  await attachDisplayNames(rejectRows, 'requester_oid', 'requester_name');
  const recentRejections: RecentRejectionRow[] = rejectRows.map((r) => ({
    requestId: r.request_id,
    rejectedAt: formatDateTime(r.rejected_at),
    requesterName: r.requester_name,
    programType: r.program_type,
    rejectionReason: (r.rejection_reason ?? '').slice(0, 120) || '—',
  }));

  const today = formatDate(new Date());
  const warrantyEnd = formatDate(
    new Date(new Date().setDate(new Date().getDate() + 30)),
  );

  const [lifecycleRows] = await pool.query<
    (RowDataPacket & {
      deployed: number;
      open_repairs: number;
      disposals: number;
      warranties_expiring: number;
    })[]
  >(
    `SELECT
      (SELECT COUNT(*) FROM laptop WHERE status_id = 3) +
      (SELECT COUNT(*) FROM av WHERE status_id = 3) +
      (SELECT COUNT(*) FROM network WHERE status_id = 3) AS deployed,
      (SELECT COUNT(*) FROM repair WHERE completed_date IS NULL) AS open_repairs,
      (SELECT COUNT(*) FROM disposal WHERE disposal_date >= ?) AS disposals,
      (SELECT COUNT(*) FROM warranty
       WHERE warranty_end_date >= ? AND warranty_end_date <= ?) AS warranties_expiring`,
    [rangeStart, today, warrantyEnd],
  );
  const lc = lifecycleRows[0];
  const lifecycle: LifecycleSnapshot = {
    deployedAssets: Number(lc?.deployed ?? 0),
    openRepairs: Number(lc?.open_repairs ?? 0),
    disposalsInPeriod: Number(lc?.disposals ?? 0),
    warrantiesExpiringSoon: Number(lc?.warranties_expiring ?? 0),
  };

  return {
    periodDays,
    stats,
    charts,
    usersByRole,
    topRequesters,
    recentRejections,
    lifecycle,
  };
}
