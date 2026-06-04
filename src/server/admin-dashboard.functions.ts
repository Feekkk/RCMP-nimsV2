import { createServerFn } from '@tanstack/react-start';
import type { AdminPeriodDays } from '@/lib/admin-dashboard-schema';
import { assertAdminRole } from '@/server/admin-auth.server';

const PERIODS: AdminPeriodDays[] = [7, 30, 90];

export const getAdminDashboardFn = createServerFn({ method: 'POST' })
  .inputValidator((data: { callerRoleId: number; periodDays?: number }) => data)
  .handler(async ({ data }) => {
    assertAdminRole(data.callerRoleId);
    const periodDays = PERIODS.includes(data.periodDays as AdminPeriodDays)
      ? (data.periodDays as AdminPeriodDays)
      : 30;
    const { getAdminDashboard } = await import('@/server/admin-dashboard-repo.server');
    return getAdminDashboard(periodDays);
  });
