import { createServerFn } from '@tanstack/react-start';

export const listActivityLogFn = createServerFn({ method: 'GET' }).handler(async () => {
  const { listActivityLog } = await import('@/server/activity-log-repo.server');
  return listActivityLog();
});
