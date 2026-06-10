import { createServerFn } from '@tanstack/react-start';
import type { RunOverdueReturnEmailJobOptions } from '@/server/overdue-return-email-job.server';

export const runOverdueReturnEmailJobFn = createServerFn({ method: 'POST' })
  .inputValidator((input: RunOverdueReturnEmailJobOptions | undefined) => input ?? {})
  .handler(async ({ data: options }) => {
    const { runOverdueReturnEmailJob } = await import('@/server/overdue-return-email-job.server');
    return runOverdueReturnEmailJob({ ...options, skipTimeCheck: true });
  });
