import { createServerFn } from '@tanstack/react-start';
import { staffMiddleware } from '@/server/auth-middleware';

export const listActivityLogFn = createServerFn({ method: 'GET' })
  .middleware([staffMiddleware])
  .handler(async () => {
    const { listActivityLog } = await import('@/server/activity-log-repo.server');
    return listActivityLog();
  });
