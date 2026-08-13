import { createServerFn } from '@tanstack/react-start';
import type { CreateAdminUserInput, UpdateAdminUserInput } from '@/lib/admin-users-schema';
import { adminMiddleware } from '@/server/core/auth-middleware';

export const listAdminUsersFn = createServerFn({ method: 'POST' })
  .middleware([adminMiddleware])
  .handler(async () => {
    const { listAdminUsers } = await import('@/server/admin/admin-users-repo.server');
    return listAdminUsers();
  });

export const createAdminUserFn = createServerFn({ method: 'POST' })
  .middleware([adminMiddleware])
  .inputValidator((data: CreateAdminUserInput) => data)
  .handler(async ({ data }) => {
    const { createAdminUser } = await import('@/server/admin/admin-users-repo.server');
    return createAdminUser(data);
  });

export const updateAdminUserFn = createServerFn({ method: 'POST' })
  .middleware([adminMiddleware])
  .inputValidator((data: UpdateAdminUserInput) => data)
  .handler(async ({ data }) => {
    const { updateAdminUser } = await import('@/server/admin/admin-users-repo.server');
    return updateAdminUser(data);
  });
