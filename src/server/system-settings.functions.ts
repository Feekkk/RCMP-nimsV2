import { createServerFn } from '@tanstack/react-start';
import { assertAdminRole } from '@/server/admin-auth.server';

export const getLoginMaintenanceModeFn = createServerFn({ method: 'GET' }).handler(async () => {
  const { isLoginMaintenanceEnabled } = await import('@/server/system-settings-repo.server');
  return { enabled: await isLoginMaintenanceEnabled() };
});

export const setLoginMaintenanceModeFn = createServerFn({ method: 'POST' })
  .inputValidator((data: { callerRoleId: number; enabled: boolean }) => data)
  .handler(async ({ data }) => {
    assertAdminRole(data.callerRoleId);
    const { setLoginMaintenanceEnabled } = await import('@/server/system-settings-repo.server');
    await setLoginMaintenanceEnabled(data.enabled);
    return { enabled: data.enabled };
  });
