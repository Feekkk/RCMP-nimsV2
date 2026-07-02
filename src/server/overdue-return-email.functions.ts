import { createServerFn } from '@tanstack/react-start';
import type { RunOverdueAutoRejectJobOptions } from '@/server/overdue-auto-reject-job.server';
import type { RunOverdueReturnEmailJobOptions } from '@/server/overdue-return-email-job.server';

export const runOverdueReturnEmailJobFn = createServerFn({ method: 'POST' })
  .inputValidator((input: RunOverdueReturnEmailJobOptions | undefined) => input ?? {})
  .handler(async ({ data: options }) => {
    const { runOverdueReturnEmailJob } = await import('@/server/overdue-return-email-job.server');
    return runOverdueReturnEmailJob({ ...options, skipTimeCheck: true });
  });

export const runOverdueAutoRejectJobFn = createServerFn({ method: 'POST' })
  .inputValidator((input: RunOverdueAutoRejectJobOptions | undefined) => input ?? {})
  .handler(async ({ data: options }) => {
    const { runOverdueAutoRejectJob } = await import('@/server/overdue-auto-reject-job.server');
    return runOverdueAutoRejectJob({ ...options, skipTimeCheck: true });
  });
