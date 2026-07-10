import { createServerFn } from '@tanstack/react-start';

export const sendHandoverEmailFn = createServerFn({ method: 'POST' })
  .inputValidator((handoverId: number) => handoverId)
  .handler(async ({ data: handoverId }) => {
    const { sendHandoverEmail } = await import('@/server/handover-email.server');
    return sendHandoverEmail(handoverId);
  });

/** Kicks off the handover email in the background and returns immediately — used right after a handover is recorded. */
export const queueHandoverEmailFn = createServerFn({ method: 'POST' })
  .inputValidator((handoverId: number) => handoverId)
  .handler(async ({ data: handoverId }) => {
    const { queueHandoverEmail } = await import('@/server/handover-email.server');
    queueHandoverEmail(handoverId);
    return { queued: true };
  });

export const getHandoverEmailStatusFn = createServerFn({ method: 'GET' })
  .inputValidator((handoverId: number) => handoverId)
  .handler(async ({ data: handoverId }) => {
    const { getHandoverEmailStatus } = await import('@/server/handover-email-repo.server');
    return getHandoverEmailStatus(handoverId);
  });
