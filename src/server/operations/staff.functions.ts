import { createServerFn } from '@tanstack/react-start';
import type { CreateStaffInput, UpdateStaffInput } from '@/lib/staff-schema';
import { staffMiddleware } from '@/server/core/auth-middleware';

export const listStaffDirectoryFn = createServerFn({ method: 'GET' })
  .middleware([staffMiddleware])
  .handler(async () => {
    const { listStaffDirectory } = await import('@/server/operations/staff-repo.server');
    return listStaffDirectory();
  });

export const createStaffFn = createServerFn({ method: 'POST' })
  .middleware([staffMiddleware])
  .inputValidator((data: CreateStaffInput) => data)
  .handler(async ({ data }) => {
    const { createStaff } = await import('@/server/operations/staff-repo.server');
    return createStaff(data);
  });

export const updateStaffFn = createServerFn({ method: 'POST' })
  .middleware([staffMiddleware])
  .inputValidator((data: UpdateStaffInput) => data)
  .handler(async ({ data }) => {
    const { updateStaff } = await import('@/server/operations/staff-repo.server');
    return updateStaff(data);
  });

export const listStaffHandoverAssetsFn = createServerFn({ method: 'GET' })
  .middleware([staffMiddleware])
  .inputValidator((employeeNo: string) => employeeNo)
  .handler(async ({ data: employeeNo }) => {
    const { listStaffHandoverAssets } = await import('@/server/operations/staff-repo.server');
    return listStaffHandoverAssets(employeeNo);
  });
