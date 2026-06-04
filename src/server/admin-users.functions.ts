import { createServerFn } from '@tanstack/react-start';
import type { CreateAdminUserInput, UpdateAdminUserInput } from '@/lib/admin-users-schema';
import { assertAdminRole } from '@/server/admin-auth.server';

type AdminCallerInput = { callerRoleId: number };

export const listAdminUsersFn = createServerFn({ method: 'POST' })
  .inputValidator((data: AdminCallerInput) => data)
  .handler(async ({ data }) => {
    assertAdminRole(data.callerRoleId);
    const { listAdminUsers } = await import('@/server/admin-users-repo.server');
    return listAdminUsers();
  });

export const createAdminUserFn = createServerFn({ method: 'POST' })
  .inputValidator((data: CreateAdminUserInput & AdminCallerInput) => data)
  .handler(async ({ data }) => {
    assertAdminRole(data.callerRoleId);
    const { createAdminUser } = await import('@/server/admin-users-repo.server');
    const { callerRoleId: _, ...input } = data;
    return createAdminUser(input);
  });

export const updateAdminUserFn = createServerFn({ method: 'POST' })
  .inputValidator((data: UpdateAdminUserInput & AdminCallerInput) => data)
  .handler(async ({ data }) => {
    assertAdminRole(data.callerRoleId);
    const { updateAdminUser } = await import('@/server/admin-users-repo.server');
    const { callerRoleId: _, ...input } = data;
    return updateAdminUser(input);
  });
