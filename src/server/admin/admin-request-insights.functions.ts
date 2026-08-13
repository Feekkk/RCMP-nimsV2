import { createServerFn } from '@tanstack/react-start';
import { adminMiddleware } from '@/server/core/auth-middleware';

export const getAdminRequestInsightsFn = createServerFn({ method: 'GET' })
  .middleware([adminMiddleware])
  .handler(async () => {
    const { getAdminRequestInsights } = await import('@/server/admin/admin-request-insights-repo.server');
    return getAdminRequestInsights();
  });
