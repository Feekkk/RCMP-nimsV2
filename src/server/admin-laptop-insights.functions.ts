import { createServerFn } from '@tanstack/react-start';

export const getLaptopTopDepartmentsFn = createServerFn({ method: 'GET' }).handler(async () => {
  const { getLaptopTopDepartments } = await import('@/server/admin-laptop-insights-repo.server');
  return getLaptopTopDepartments();
});
