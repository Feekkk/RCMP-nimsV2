import { loadServerEnv } from '@/server/core/env.server';

export type WhatsAppConfig = {
  accessToken: string;
  phoneNumberId: string;
  businessAccountId: string | null;
  apiVersion: string;
  apiBaseUrl: string;
  verifyToken: string | null;
  appSecret: string | null;
};

const DEFAULT_API_VERSION = 'v21.0';
const DEFAULT_API_BASE_URL = 'https://graph.facebook.com';

export function getWhatsAppConfig(): WhatsAppConfig | null {
  loadServerEnv();

  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN?.trim();
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim();
  if (!accessToken || !phoneNumberId) return null;

  const apiVersion =
    process.env.WHATSAPP_API_VERSION?.trim() || DEFAULT_API_VERSION;
  const apiBaseUrl = (
    process.env.WHATSAPP_API_BASE_URL?.trim() || DEFAULT_API_BASE_URL
  ).replace(/\/+$/, '');

  return {
    accessToken,
    phoneNumberId,
    businessAccountId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID?.trim() || null,
    apiVersion,
    apiBaseUrl,
    verifyToken: process.env.WHATSAPP_VERIFY_TOKEN?.trim() || null,
    appSecret: process.env.WHATSAPP_APP_SECRET?.trim() || null,
  };
}

export function isWhatsAppConfigured(): boolean {
  return getWhatsAppConfig() != null;
}

export function whatsappMessagesUrl(config: WhatsAppConfig): string {
  return `${config.apiBaseUrl}/${config.apiVersion}/${config.phoneNumberId}/messages`;
}
