/** Outbound notification payloads (recipients come from users.email in DB at send time). */

export type SendNotificationEmailInput = {
  to: string | string[];
  subject: string;
  text: string;
  html?: string;
};

export type SendNotificationEmailResult = {
  messageId: string;
  accepted: string[];
};
