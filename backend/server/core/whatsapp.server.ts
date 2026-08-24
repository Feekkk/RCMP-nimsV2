import {
  getWhatsAppConfig,
  isWhatsAppConfigured,
  whatsappMessagesUrl,
  type WhatsAppConfig,
} from '@backend/lib/whatsapp-config';
import {
  WHATSAPP_NOT_CONFIGURED_MESSAGE,
  type SendWhatsAppResult,
  type SendWhatsAppTemplateInput,
  type SendWhatsAppTextInput,
} from '@shared/lib/whatsapp-notification';

const WHATSAPP_RECIPIENT_MISSING =
  'No valid recipient phone number was found. Use international format (e.g. 60123456789).';

export function normalizeWhatsAppPhone(raw: string): string {
  const digits = raw.replace(/[^\d]/g, '');
  if (digits.length < 8) {
    throw new Error(WHATSAPP_RECIPIENT_MISSING);
  }
  return digits;
}

type GraphMessagesResponse = {
  messaging_product?: string;
  contacts?: Array<{ input?: string; wa_id?: string }>;
  messages?: Array<{ id?: string }>;
  error?: {
    message?: string;
    type?: string;
    code?: number;
    error_data?: { details?: string };
    fbtrace_id?: string;
  };
};

async function postWhatsAppMessage(
  config: WhatsAppConfig,
  payload: Record<string, unknown>,
): Promise<SendWhatsAppResult> {
  const response = await fetch(whatsappMessagesUrl(config), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = (await response.json()) as GraphMessagesResponse;

  if (!response.ok || data.error) {
    const details =
      data.error?.error_data?.details ||
      data.error?.message ||
      `WhatsApp API request failed (${response.status})`;
    throw new Error(details);
  }

  const messageId = data.messages?.[0]?.id?.trim();
  if (!messageId) {
    throw new Error('WhatsApp API did not return a message id.');
  }

  return {
    messageId,
    waId: data.contacts?.[0]?.wa_id?.trim() || null,
  };
}

export async function sendWhatsAppTextMessage(
  input: SendWhatsAppTextInput,
): Promise<SendWhatsAppResult> {
  if (!isWhatsAppConfigured()) {
    throw new Error(WHATSAPP_NOT_CONFIGURED_MESSAGE);
  }

  const config = getWhatsAppConfig()!;
  const to = normalizeWhatsAppPhone(input.to);
  const body = input.body.trim();
  if (!body) throw new Error('A WhatsApp message body is required before sending.');

  return postWhatsAppMessage(config, {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'text',
    text: {
      preview_url: Boolean(input.previewUrl),
      body,
    },
  });
}

export async function sendWhatsAppTemplateMessage(
  input: SendWhatsAppTemplateInput,
): Promise<SendWhatsAppResult> {
  if (!isWhatsAppConfigured()) {
    throw new Error(WHATSAPP_NOT_CONFIGURED_MESSAGE);
  }

  const config = getWhatsAppConfig()!;
  const to = normalizeWhatsAppPhone(input.to);
  const templateName = input.templateName.trim();
  if (!templateName) {
    throw new Error('A WhatsApp template name is required before sending.');
  }

  return postWhatsAppMessage(config, {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'template',
    template: {
      name: templateName,
      language: {
        code: input.languageCode?.trim() || 'en',
      },
      ...(input.components?.length ? { components: input.components } : {}),
    },
  });
}
