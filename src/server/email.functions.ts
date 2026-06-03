import { createServerFn } from '@tanstack/react-start';
import type { SendNotificationEmailInput } from '@/lib/email-notification';

export const sendNotificationEmailFn = createServerFn({ method: 'POST' })
  .inputValidator((input: SendNotificationEmailInput) => input)
  .handler(async ({ data: input }) => {
    const { sendNotificationEmail } = await import('@/server/email.server');
    return sendNotificationEmail(input);
  });

export const verifyEmailConfigFn = createServerFn({ method: 'GET' }).handler(async () => {
  const { isEmailConfigured } = await import('@/lib/microsoft-email-config');
  if (!isEmailConfigured()) {
    return {
      configured: false as const,
      ok: false,
      message:
        'SMTP is not configured. Set SMTP_USER/SMTP_PASSWORD (M365) or SMTP_MAILPIT=true',
    };
  }
  try {
    const { verifyEmailTransport } = await import('@/server/email.server');
    await verifyEmailTransport();
    return { configured: true as const, ok: true, message: 'SMTP connection verified' };
  } catch (e) {
    const message = e instanceof Error ? e.message : 'SMTP verification failed';
    return { configured: true as const, ok: false, message };
  }
});
