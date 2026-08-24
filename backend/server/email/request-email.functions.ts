import { createServerFn } from '@tanstack/react-start';
import { staffMiddleware } from '@backend/server/core/auth-middleware';

export const sendRequestEmailFn = createServerFn({ method: 'POST' })
  .middleware([staffMiddleware])
  .inputValidator((requestId: number) => requestId)
  .handler(async ({ data: requestId }) => {
    const { sendRequestEmail } = await import('@backend/server/email/request-email.server');
    return sendRequestEmail(requestId);
  });
