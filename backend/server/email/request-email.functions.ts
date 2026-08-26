import { createServerFn } from '@tanstack/react-start';
import { requesterMiddleware } from '@backend/server/core/auth-middleware';

export const sendRequestEmailFn = createServerFn({ method: 'POST' })
  .middleware([requesterMiddleware])
  .inputValidator((requestId: number) => requestId)
  .handler(async ({ data: requestId, context }) => {
    const { getRequestEmailData } = await import('@backend/server/email/request-email-repo.server');
    const { sendRequestEmail } = await import('@backend/server/email/request-email.server');
    const data = await getRequestEmailData(requestId);
    if (!data || data.requestedBy !== context.staffId) {
      throw new Error(
        'The confirmation email could not be sent because this request could not be found. Refresh the page and try again.',
      );
    }
    return sendRequestEmail(requestId);
  });
