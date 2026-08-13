import { createServerFn } from '@tanstack/react-start';
import { staffMiddleware } from '@/server/core/auth-middleware';

export const listActivityLogFn = createServerFn({ method: 'GET' })
  .middleware([staffMiddleware])
  .handler(async () => {
    const { listActivityLog } = await import('@/server/operations/activity-log-repo.server');
    return listActivityLog();
  });
