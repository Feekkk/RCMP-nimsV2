import { createServerFn } from '@tanstack/react-start';
import { staffMiddleware } from '@backend/server/core/auth-middleware';

export const listActivityLogFn = createServerFn({ method: 'GET' })
  .middleware([staffMiddleware])
  .handler(async () => {
    const { listActivityLog } = await import('@backend/server/operations/activity-log-repo.server');
    return listActivityLog();
  });
