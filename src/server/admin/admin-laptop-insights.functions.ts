import { createServerFn } from '@tanstack/react-start';
import { adminMiddleware } from '@/server/auth-middleware';

export const getLaptopDepartmentHandoversFn = createServerFn({ method: 'GET' })
  .middleware([adminMiddleware])
  .handler(async () => {
    const { getLaptopDepartmentHandovers } = await import('@/server/admin-laptop-insights-repo.server');
    return getLaptopDepartmentHandovers();
  });
