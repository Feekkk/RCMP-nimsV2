import { createServerFn } from '@tanstack/react-start';
import type { SendRequestReturnEmailInput } from '@/lib/request-return-email-types';
import { staffMiddleware } from '@/server/core/auth-middleware';

export const sendRequestReturnEmailFn = createServerFn({ method: 'POST' })
  .middleware([staffMiddleware])
  .inputValidator((input: SendRequestReturnEmailInput) => input)
  .handler(async ({ data: input }) => {
    const { sendRequestReturnEmail } = await import('@/server/email/request-return-email.server');
    return sendRequestReturnEmail(input);
  });
