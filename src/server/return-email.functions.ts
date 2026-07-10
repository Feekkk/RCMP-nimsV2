import { createServerFn } from '@tanstack/react-start';

export const sendReturnEmailFn = createServerFn({ method: 'POST' })
  .inputValidator((returnId: number) => returnId)
  .handler(async ({ data: returnId }) => {
    const { sendReturnEmail } = await import('@/server/return-email.server');
    return sendReturnEmail(returnId);
  });

/** Kicks off the return email in the background and returns immediately — used right after a return is recorded. */
export const queueReturnEmailFn = createServerFn({ method: 'POST' })
  .inputValidator((returnId: number) => returnId)
  .handler(async ({ data: returnId }) => {
    const { queueReturnEmail } = await import('@/server/return-email.server');
    queueReturnEmail(returnId);
    return { queued: true };
  });

export const getReturnEmailStatusFn = createServerFn({ method: 'GET' })
  .inputValidator((returnId: number) => returnId)
  .handler(async ({ data: returnId }) => {
    const { getReturnEmailStatus } = await import('@/server/return-email-repo.server');
    return getReturnEmailStatus(returnId);
  });
