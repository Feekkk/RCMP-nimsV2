import { createServerFn } from '@tanstack/react-start';
import type { SendNotificationEmailInput } from '@/lib/email-notification';
import { staffMiddleware } from '@/server/auth-middleware';

export const sendNotificationEmailFn = createServerFn({ method: 'POST' })
  .middleware([staffMiddleware])
  .inputValidator((input: SendNotificationEmailInput) => input)
  .handler(async ({ data: input }) => {
    const { sendNotificationEmail } = await import('@/server/email.server');
    return sendNotificationEmail(input);
  });

export const verifyEmailConfigFn = createServerFn({ method: 'GET' })
  .middleware([staffMiddleware])
  .handler(async () => {
    const { isEmailConfigured } = await import('@/lib/microsoft-email-config');
    if (!isEmailConfigured()) {
      return {
        configured: false as const,
        ok: false,
        message:
          'Email is not set up on this server. Contact Admin to configure email notifications.',
      };
    }
    try {
      const { verifyEmailTransport } = await import('@/server/email.server');
      await verifyEmailTransport();
      return { configured: true as const, ok: true, message: 'Email connection verified successfully.' };
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Email connection could not be verified. Contact Admin if this keeps happening.';
      return { configured: true as const, ok: false, message };
    }
  });
