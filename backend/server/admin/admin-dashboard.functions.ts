import { createServerFn } from '@tanstack/react-start';
import type { AdminPeriodDays } from '@shared/lib/admin-dashboard-schema';
import { adminMiddleware } from '@backend/server/core/auth-middleware';

export const getAdminDashboardFn = createServerFn({ method: 'POST' })
  .middleware([adminMiddleware])
  .inputValidator((data?: { periodDays: AdminPeriodDays }) => data ?? { periodDays: 30 as const })
  .handler(async ({ data }) => {
    const { getAdminDashboard } = await import('@backend/server/admin/admin-dashboard-repo.server');
    return getAdminDashboard(data.periodDays);
  });
