import { createServerFn } from '@tanstack/react-start';
import type { SendCheckoutEmailInput } from '@/lib/checkout-email-types';

export const sendCheckoutEmailFn = createServerFn({ method: 'POST' })
  .inputValidator((input: SendCheckoutEmailInput) => input)
  .handler(async ({ data: input }) => {
    const { sendCheckoutEmail } = await import('@/server/checkout-email.server');
    return sendCheckoutEmail(input);
  });
