import { createServerFn } from '@tanstack/react-start';

export const sendHandoverEmailFn = createServerFn({ method: 'POST' })
  .inputValidator((handoverId: number) => handoverId)
  .handler(async ({ data: handoverId }) => {
    const { sendHandoverEmail } = await import('@/server/handover-email.server');
    return sendHandoverEmail(handoverId);
  });
