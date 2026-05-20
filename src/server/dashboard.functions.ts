import { createServerFn } from '@tanstack/react-start';

export const getTechnicianDashboardFn = createServerFn({ method: 'GET' })
  .inputValidator((weekOffset?: number) => weekOffset ?? 0)
  .handler(async ({ data: weekOffset }) => {
    const { getTechnicianDashboard } = await import('@/server/dashboard-repo.server');
    return getTechnicianDashboard(weekOffset);
  });
