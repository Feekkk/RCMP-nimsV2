import { createServerFn } from '@tanstack/react-start';
import { staffMiddleware } from '@/server/auth-middleware';

export const sendReturnEmailFn = createServerFn({ method: 'POST' })
  .middleware([staffMiddleware])
  .inputValidator((returnId: number) => returnId)
  .handler(async ({ data: returnId }) => {
    const { sendReturnEmail } = await import('@/server/return-email.server');
    return sendReturnEmail(returnId);
  });

/** Kicks off the return email in the background and returns immediately — used right after a return is recorded. */
export const queueReturnEmailFn = createServerFn({ method: 'POST' })
  .middleware([staffMiddleware])
  .inputValidator((returnId: number) => returnId)
  .handler(async ({ data: returnId }) => {
    const { queueReturnEmail } = await import('@/server/return-email.server');
    queueReturnEmail(returnId);
    return { queued: true };
  });

export const getReturnEmailStatusFn = createServerFn({ method: 'GET' })
  .middleware([staffMiddleware])
  .inputValidator((returnId: number) => returnId)
  .handler(async ({ data: returnId }) => {
    const { getReturnEmailStatus } = await import('@/server/return-email-repo.server');
    return getReturnEmailStatus(returnId);
  });
