import { createServerFn } from '@tanstack/react-start';

export const getLandingSystemStatusFn = createServerFn({ method: 'GET' }).handler(async () => {
  const { getLandingSystemStatus } = await import('@/server/landing-status-repo.server');
  return getLandingSystemStatus();
});
