import { createServerFn } from '@tanstack/react-start';
import { adminMiddleware } from '@backend/server/core/auth-middleware';

export const getLoginMaintenanceModeFn = createServerFn({ method: 'GET' }).handler(async () => {
  const { isLoginMaintenanceEnabled } = await import('@backend/server/operations/system-settings-repo.server');
  return { enabled: await isLoginMaintenanceEnabled() };
});

export const setLoginMaintenanceModeFn = createServerFn({ method: 'POST' })
  .middleware([adminMiddleware])
  .inputValidator((data: { enabled: boolean }) => data)
  .handler(async ({ data }) => {
    const { setLoginMaintenanceEnabled } = await import('@backend/server/operations/system-settings-repo.server');
    await setLoginMaintenanceEnabled(data.enabled);
    return { enabled: data.enabled };
  });
