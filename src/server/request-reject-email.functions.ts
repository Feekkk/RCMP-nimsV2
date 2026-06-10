import { createServerFn } from '@tanstack/react-start';

export const sendRequestRejectEmailFn = createServerFn({ method: 'POST' })
  .inputValidator((requestId: number) => requestId)
  .handler(async ({ data: requestId }) => {
    const { sendRequestRejectEmail } = await import('@/server/request-reject-email.server');
    return sendRequestRejectEmail(requestId);
  });
