import { createServerFn } from '@tanstack/react-start';
import type { CreateStaffInput, UpdateStaffInput } from '@/lib/staff-schema';

export const listStaffDirectoryFn = createServerFn({ method: 'GET' }).handler(async () => {
  const { listStaffDirectory } = await import('@/server/staff-repo.server');
  return listStaffDirectory();
});

export const createStaffFn = createServerFn({ method: 'POST' })
  .inputValidator((data: CreateStaffInput) => data)
  .handler(async ({ data }) => {
    const { createStaff } = await import('@/server/staff-repo.server');
    return createStaff(data);
  });

export const updateStaffFn = createServerFn({ method: 'POST' })
  .inputValidator((data: UpdateStaffInput) => data)
  .handler(async ({ data }) => {
    const { updateStaff } = await import('@/server/staff-repo.server');
    return updateStaff(data);
  });
