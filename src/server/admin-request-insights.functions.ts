import { createServerFn } from '@tanstack/react-start';

export const getAdminRequestInsightsFn = createServerFn({ method: 'GET' }).handler(async () => {
  const { getAdminRequestInsights } = await import('@/server/admin-request-insights-repo.server');
  return getAdminRequestInsights();
});
