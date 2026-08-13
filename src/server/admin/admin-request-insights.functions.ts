import { createServerFn } from '@tanstack/react-start';
import { adminMiddleware } from '@/server/auth-middleware';

export const getAdminRequestInsightsFn = createServerFn({ method: 'GET' })
  .middleware([adminMiddleware])
  .handler(async () => {
    const { getAdminRequestInsights } = await import('@/server/admin-request-insights-repo.server');
    return getAdminRequestInsights();
  });
