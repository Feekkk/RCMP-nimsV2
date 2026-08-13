import { createServerFn } from '@tanstack/react-start';
import { staffMiddleware } from '@/server/core/auth-middleware';

export const sendHandoverEmailFn = createServerFn({ method: 'POST' })
  .middleware([staffMiddleware])
  .inputValidator((handoverId: number) => handoverId)
  .handler(async ({ data: handoverId }) => {
    const { sendHandoverEmail } = await import('@/server/email/handover-email.server');
    return sendHandoverEmail(handoverId);
  });

/** Kicks off the handover email in the background and returns immediately — used right after a handover is recorded. */
export const queueHandoverEmailFn = createServerFn({ method: 'POST' })
  .middleware([staffMiddleware])
  .inputValidator((handoverId: number) => handoverId)
  .handler(async ({ data: handoverId }) => {
    const { queueHandoverEmail } = await import('@/server/email/handover-email.server');
    queueHandoverEmail(handoverId);
    return { queued: true };
  });

export const getHandoverEmailStatusFn = createServerFn({ method: 'GET' })
  .middleware([staffMiddleware])
  .inputValidator((handoverId: number) => handoverId)
  .handler(async ({ data: handoverId }) => {
    const { getHandoverEmailStatus } = await import('@/server/email/handover-email-repo.server');
    return getHandoverEmailStatus(handoverId);
  });
