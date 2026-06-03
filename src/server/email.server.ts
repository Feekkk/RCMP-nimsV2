import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import type { SendNotificationEmailInput, SendNotificationEmailResult } from '@/lib/email-notification';
import { getMicrosoftEmailConfig, isEmailConfigured } from '@/lib/microsoft-email-config';

let transporter: Transporter | null = null;

function getTransporter(): Transporter {
  const config = getMicrosoftEmailConfig();
  if (!config) {
    throw new Error(
      'Email is not configured. Set SMTP_USER/SMTP_PASSWORD or SMTP_MAILPIT=true',
    );
  }

  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      ...(config.auth ? { auth: config.auth } : {}),
      requireTLS: Boolean(config.auth) && !config.secure && config.port === 587,
      tls: config.auth ? undefined : { rejectUnauthorized: false },
    });
  }

  return transporter;
}

function normalizeRecipients(to: string | string[], required = true): string[] {
  const list = Array.isArray(to) ? to : [to];
  const out = list.map((e) => e.trim().toLowerCase()).filter((e) => e.includes('@'));
  if (required && out.length === 0) throw new Error('No valid recipient email address');
  return out;
}

function toNodemailerAttachments(input: SendNotificationEmailInput['attachments']) {
  if (!input?.length) return undefined;
  return input.map((a) => ({
    filename: a.filename,
    content: Buffer.isBuffer(a.content) ? a.content : Buffer.from(a.content),
    contentType: a.contentType,
    ...(a.cid
      ? { cid: a.cid, contentDisposition: 'inline' as const }
      : { contentDisposition: 'attachment' as const }),
  }));
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

  const cc = input.cc ? normalizeRecipients(input.cc, false) : [];
  const attachments = toNodemailerAttachments(input.attachments);

  const transport = getTransporter();
  const info = await transport.sendMail({
    from: `"${config.fromName}" <${config.fromAddress}>`,
    to: to.join(', '),
    ...(cc.length > 0 ? { cc: cc.join(', ') } : {}),
    subject,
    text: text || undefined,
    html: input.html?.trim() || undefined,
    ...(attachments ? { attachments } : {}),
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
