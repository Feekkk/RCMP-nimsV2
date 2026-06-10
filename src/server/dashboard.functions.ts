import { createServerFn } from '@tanstack/react-start';

export const getTechnicianDashboardFn = createServerFn({ method: 'GET' })
  .inputValidator((data?: { year: number; month: number }) => {
    const now = new Date();
    return data ?? { year: now.getFullYear(), month: now.getMonth() + 1 };
  })
  .handler(async ({ data }) => {
    const { getTechnicianDashboard } = await import('@/server/dashboard-repo.server');
    return getTechnicianDashboard(data);
  });
