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
        'Email is not set up on this server. Contact IT to configure email notifications.',
    };
  }
  try {
    const { verifyEmailTransport } = await import('@/server/email.server');
    await verifyEmailTransport();
    return { configured: true as const, ok: true, message: 'Email connection verified successfully.' };
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Email connection could not be verified. Contact IT if this keeps happening.';
    return { configured: true as const, ok: false, message };
  }
});
