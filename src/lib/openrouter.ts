import '@/server/env.server';
import { createOpenRouterText } from '@tanstack/ai-openrouter';

type OpenRouterModel = Parameters<typeof createOpenRouterText>[0];

const DEFAULT_MODEL = 'poolside/laguna-xs-2.1:free' as OpenRouterModel;

export function getOpenRouterModel(): OpenRouterModel {
  const fromEnv = process.env.OPENROUTER_MODEL?.trim();
  if (fromEnv) return fromEnv as OpenRouterModel;
  return DEFAULT_MODEL;
}

export function getOpenRouterChatAdapter(model = getOpenRouterModel()) {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY is not set. Add it to your .env file.');
  }

  return createOpenRouterText(model, apiKey, {
    httpReferer:
      process.env.OPENROUTER_HTTP_REFERER?.trim() || 'http://localhost:8080',
    appTitle: process.env.OPENROUTER_APP_TITLE?.trim() || 'NIMS',
  });
}

export function isOpenRouterConfigured() {
  return Boolean(process.env.OPENROUTER_API_KEY?.trim());
}
