import { createServerFn } from '@tanstack/react-start';
import { staffMiddleware } from '@backend/server/core/auth-middleware';

export const getTechnicianDashboardFn = createServerFn({ method: 'GET' })
  .middleware([staffMiddleware])
  .inputValidator((data?: { year: number; month: number }) => {
    const now = new Date();
    return data ?? { year: now.getFullYear(), month: now.getMonth() + 1 };
  })
  .handler(async ({ data }) => {
    const { getTechnicianDashboard } = await import('@backend/server/operations/dashboard-repo.server');
    return getTechnicianDashboard(data);
  });
