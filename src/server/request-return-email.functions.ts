import { createServerFn } from '@tanstack/react-start';
import type { SendRequestReturnEmailInput } from '@/lib/request-return-email-types';

export const sendRequestReturnEmailFn = createServerFn({ method: 'POST' })
  .inputValidator((input: SendRequestReturnEmailInput) => input)
  .handler(async ({ data: input }) => {
    const { sendRequestReturnEmail } = await import('@/server/request-return-email.server');
    return sendRequestReturnEmail(input);
  });
