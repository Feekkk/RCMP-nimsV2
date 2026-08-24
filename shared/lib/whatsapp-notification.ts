export const WHATSAPP_NOT_CONFIGURED_MESSAGE =
  'WhatsApp notifications are not set up on this server. Your action may have completed, but no WhatsApp message was sent. Contact IT to enable WhatsApp.';

export type WhatsAppTemplateComponent = {
  type: 'header' | 'body' | 'button';
  sub_type?: 'quick_reply' | 'url' | 'catalog';
  index?: string;
  parameters: Array<
    | { type: 'text'; text: string }
    | { type: 'currency'; currency: { fallback_value: string; code: string; amount_1000: number } }
    | { type: 'date_time'; date_time: { fallback_value: string } }
    | { type: 'image'; image: { link: string } }
    | { type: 'document'; document: { link: string; filename?: string } }
    | { type: 'video'; video: { link: string } }
    | { type: 'payload'; payload: string }
  >;
};

export type SendWhatsAppTextInput = {
  to: string;
  body: string;
  previewUrl?: boolean;
};

export type SendWhatsAppTemplateInput = {
  to: string;
  templateName: string;
  languageCode?: string;
  components?: WhatsAppTemplateComponent[];
};

export type SendWhatsAppResult = {
  messageId: string;
  waId: string | null;
};
