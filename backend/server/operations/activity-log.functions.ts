import { createServerFn } from '@tanstack/react-start';
import { staffMiddleware } from '@backend/server/core/auth-middleware';
import { isAdminRole } from '@shared/lib/auth-session';

export const listActivityLogFn = createServerFn({ method: 'GET' })
  .middleware([staffMiddleware])
  .handler(async ({ context }) => {
    const { listActivityLog } = await import('@backend/server/operations/activity-log-repo.server');
    return listActivityLog({ revealPersonalData: isAdminRole(context.roleId) });
  });
