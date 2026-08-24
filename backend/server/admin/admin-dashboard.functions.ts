import { createServerFn } from '@tanstack/react-start';
import type { AdminPeriodDays } from '@shared/lib/admin-dashboard-schema';
import { adminMiddleware } from '@backend/server/core/auth-middleware';

const PERIODS: AdminPeriodDays[] = [7, 30, 90];

export const getAdminDashboardFn = createServerFn({ method: 'POST' })
  .middleware([adminMiddleware])
  .inputValidator((data: { periodDays?: number }) => data)
  .handler(async ({ data }) => {
    const periodDays = PERIODS.includes(data.periodDays as AdminPeriodDays)
      ? (data.periodDays as AdminPeriodDays)
      : 30;
    const { getAdminDashboard } = await import('@backend/server/admin/admin-dashboard-repo.server');
    return getAdminDashboard(periodDays);
  });
