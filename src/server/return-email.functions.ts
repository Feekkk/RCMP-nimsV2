import { createServerFn } from '@tanstack/react-start';

export const sendReturnEmailFn = createServerFn({ method: 'POST' })
  .inputValidator((returnId: number) => returnId)
  .handler(async ({ data: returnId }) => {
    const { sendReturnEmail } = await import('@/server/return-email.server');
    return sendReturnEmail(returnId);
  });
