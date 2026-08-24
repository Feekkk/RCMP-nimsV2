import { createServerFn } from '@tanstack/react-start';
import { adminMiddleware } from '@backend/server/core/auth-middleware';

export const getAdminRequestInsightsFn = createServerFn({ method: 'GET' })
  .middleware([adminMiddleware])
  .handler(async () => {
    const { getAdminRequestInsights } = await import('@backend/server/admin/admin-request-insights-repo.server');
    return getAdminRequestInsights();
  });
