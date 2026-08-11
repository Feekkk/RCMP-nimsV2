import { createServerFn } from '@tanstack/react-start';
import { adminMiddleware } from '@/server/auth-middleware';

export const listActivityLogFn = createServerFn({ method: 'GET' })
  .middleware([adminMiddleware])
  .handler(async () => {
    const { listActivityLog } = await import('@/server/activity-log-repo.server');
    return listActivityLog();
  });
