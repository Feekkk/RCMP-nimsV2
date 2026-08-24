/** Outbound notification payloads (recipients come from users.email in DB at send time). */

export const EMAIL_NOT_CONFIGURED_MESSAGE =
  'Email notifications are not set up on this server. Your action may have completed, but no email was sent. Contact IT to enable email.';

export type EmailAttachment = {
  filename: string;
  content: Buffer | Uint8Array | string;
  contentType?: string;
  /** Inline image id for HTML cid: references */
  cid?: string;
};

export type SendNotificationEmailInput = {
  to: string | string[];
  cc?: string | string[];
  subject: string;
  text: string;
  html?: string;
  attachments?: EmailAttachment[];
};

export type SendNotificationEmailResult = {
  messageId: string;
  accepted: string[];
};
