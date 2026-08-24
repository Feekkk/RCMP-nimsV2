import { createServerFn } from '@tanstack/react-start';
import { adminMiddleware } from '@backend/server/core/auth-middleware';

export const getLaptopDepartmentHandoversFn = createServerFn({ method: 'GET' })
  .middleware([adminMiddleware])
  .handler(async () => {
    const { getLaptopDepartmentHandovers } = await import('@backend/server/admin/admin-laptop-insights-repo.server');
    return getLaptopDepartmentHandovers();
  });
