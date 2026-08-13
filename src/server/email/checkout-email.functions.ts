import { createServerFn } from '@tanstack/react-start';
import type { SendCheckoutEmailInput } from '@/lib/checkout-email-types';
import { staffMiddleware } from '@/server/core/auth-middleware';

export const sendCheckoutEmailFn = createServerFn({ method: 'POST' })
  .middleware([staffMiddleware])
  .inputValidator((input: SendCheckoutEmailInput) => input)
  .handler(async ({ data: input }) => {
    const { sendCheckoutEmail } = await import('@/server/email/checkout-email.server');
    return sendCheckoutEmail(input);
  });
