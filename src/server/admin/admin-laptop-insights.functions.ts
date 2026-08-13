import { createServerFn } from '@tanstack/react-start';
import { adminMiddleware } from '@/server/core/auth-middleware';

export const getLaptopDepartmentHandoversFn = createServerFn({ method: 'GET' })
  .middleware([adminMiddleware])
  .handler(async () => {
    const { getLaptopDepartmentHandovers } = await import('@/server/admin/admin-laptop-insights-repo.server');
    return getLaptopDepartmentHandovers();
  });
