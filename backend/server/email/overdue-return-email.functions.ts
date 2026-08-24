import { createServerFn } from '@tanstack/react-start';
import type { RunOverdueAutoRejectJobOptions } from '@backend/server/jobs/overdue-auto-reject-job.server';
import type { RunOverdueReturnEmailJobOptions } from '@backend/server/jobs/overdue-return-email-job.server';
import { adminMiddleware } from '@backend/server/core/auth-middleware';

export const runOverdueReturnEmailJobFn = createServerFn({ method: 'POST' })
  .middleware([adminMiddleware])
  .inputValidator((input: RunOverdueReturnEmailJobOptions | undefined) => input ?? {})
  .handler(async ({ data: options }) => {
    const { runOverdueReturnEmailJob } = await import('@backend/server/jobs/overdue-return-email-job.server');
    return runOverdueReturnEmailJob({ ...options, skipTimeCheck: true });
  });

export const runOverdueAutoRejectJobFn = createServerFn({ method: 'POST' })
  .middleware([adminMiddleware])
  .inputValidator((input: RunOverdueAutoRejectJobOptions | undefined) => input ?? {})
  .handler(async ({ data: options }) => {
    const { runOverdueAutoRejectJob } = await import('@backend/server/jobs/overdue-auto-reject-job.server');
    return runOverdueAutoRejectJob({ ...options, skipTimeCheck: true });
  });
