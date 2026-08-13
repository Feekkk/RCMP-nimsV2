import { createServerFn } from '@tanstack/react-start';
import { staffMiddleware } from '@/server/core/auth-middleware';

export const sendRequestRejectEmailFn = createServerFn({ method: 'POST' })
  .middleware([staffMiddleware])
  .inputValidator((requestId: number) => requestId)
  .handler(async ({ data: requestId }) => {
    const { sendRequestRejectEmail } = await import('@/server/email/request-reject-email.server');
    return sendRequestRejectEmail(requestId);
  });
