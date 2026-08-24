import { createServerFn } from '@tanstack/react-start';
import type { SendRequestReturnEmailInput } from '@shared/lib/request-return-email-types';
import { staffMiddleware } from '@backend/server/core/auth-middleware';

export const sendRequestReturnEmailFn = createServerFn({ method: 'POST' })
  .middleware([staffMiddleware])
  .inputValidator((input: SendRequestReturnEmailInput) => input)
  .handler(async ({ data: input }) => {
    const { sendRequestReturnEmail } = await import('@backend/server/email/request-return-email.server');
    return sendRequestReturnEmail(input);
  });
