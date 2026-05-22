import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import type { SendNotificationEmailInput, SendNotificationEmailResult } from '@/lib/email-notification';
import { getMicrosoftEmailConfig, isEmailConfigured } from '@/lib/microsoft-email-config';

let transporter: Transporter | null = null;

function getTransporter(): Transporter {
  const config = getMicrosoftEmailConfig();
  if (!config) {
    throw new Error('Email is not configured. Set SMTP_USER and SMTP_PASSWORD in the server environment.');
  }

  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: {
        user: config.user,
        pass: config.password,
      },
      requireTLS: !config.secure && config.port === 587,
    });
  }

  return transporter;
}

function normalizeRecipients(to: string | string[]): string[] {
  const list = Array.isArray(to) ? to : [to];
  const out = list.map((e) => e.trim().toLowerCase()).filter((e) => e.includes('@'));
  if (out.length === 0) throw new Error('No valid recipient email address');
  return out;
}

export async function sendNotificationEmail(
  input: SendNotificationEmailInput,
): Promise<SendNotificationEmailResult> {
  if (!isEmailConfigured()) {
    throw new Error('Email notifications are disabled (missing SMTP configuration)');
  }

  const config = getMicrosoftEmailConfig()!;
  const to = normalizeRecipients(input.to);
  const subject = input.subject.trim();
  const text = input.text.trim();

  if (!subject) throw new Error('Email subject is required');
  if (!text && !input.html?.trim()) throw new Error('Email body is required');

  const transport = getTransporter();
  const info = await transport.sendMail({
    from: `"${config.fromName}" <${config.fromAddress}>`,
    to: to.join(', '),
    subject,
    text: text || undefined,
    html: input.html?.trim() || undefined,
  });

  return {
    messageId: info.messageId,
    accepted: (info.accepted as string[]).map(String),
  };
}

/** Verify SMTP credentials (call from admin tooling or startup check). */
export async function verifyEmailTransport(): Promise<boolean> {
  if (!isEmailConfigured()) return false;
  await getTransporter().verify();
  return true;
}
