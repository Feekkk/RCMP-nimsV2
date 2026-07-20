import { createServerFn } from '@tanstack/react-start';

export const getLaptopDepartmentHandoversFn = createServerFn({ method: 'GET' }).handler(async () => {
  const { getLaptopDepartmentHandovers } = await import('@/server/admin-laptop-insights-repo.server');
  return getLaptopDepartmentHandovers();
});
