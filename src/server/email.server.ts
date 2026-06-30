import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import type { SendNotificationEmailInput, SendNotificationEmailResult } from '@/lib/email-notification';
import { EMAIL_NOT_CONFIGURED_MESSAGE_MESSAGE } from '@/lib/email-notification';
import { getMicrosoftEmailConfig, isEmailConfigured } from '@/lib/microsoft-email-config';

const EMAIL_RECIPIENT_MISSING =
  'No valid recipient email address was found. Check that the recipient has an email on file.';

let transporter: Transporter | null = null;

/** Coerces DB/driver values (e.g. numeric ids) before HTML escaping. */
export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function getTransporter(): Transporter {
  const config = getMicrosoftEmailConfig();
  if (!config) {
    throw new Error(EMAIL_NOT_CONFIGURED_MESSAGE);
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
  if (required && out.length === 0) throw new Error(EMAIL_RECIPIENT_MISSING);
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
    throw new Error(EMAIL_NOT_CONFIGURED_MESSAGE);
  }

  const config = getMicrosoftEmailConfig()!;
  const to = normalizeRecipients(input.to);
  const subject = input.subject.trim();
  const text = input.text.trim();

  if (!subject) throw new Error('An email subject is required before sending.');
  if (!text && !input.html?.trim()) throw new Error('An email message is required before sending.');

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
