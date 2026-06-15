import { createServerFn } from '@tanstack/react-start';
import type { LandingSystemStatus } from '@/lib/landing-status-types';

function fallbackStatus(message: string): LandingSystemStatus {
  return {
    fetchedAt: new Date().toLocaleString(undefined, {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }),
    rows: [
      {
        key: 'database',
        label: 'Database',
        value: message,
        level: 'error',
      },
    ],
    sampleAssets: [],
  };
}

export const getLandingSystemStatusFn = createServerFn({ method: 'GET' }).handler(async () => {
  try {
    const { getLandingSystemStatus } = await import('@/server/landing-status-repo.server');
    return await getLandingSystemStatus();
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Could not load system status';
    return fallbackStatus(message);
  }
});
