import { createServerFn } from '@tanstack/react-start';

export const sendRequestEmailFn = createServerFn({ method: 'POST' })
  .inputValidator((requestId: number) => requestId)
  .handler(async ({ data: requestId }) => {
    const { sendRequestEmail } = await import('@/server/request-email.server');
    return sendRequestEmail(requestId);
  });
