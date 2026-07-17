import { loadServerEnv } from '@/server/env.server';

/** Server-only Microsoft Entra ID (Azure AD) OAuth settings. */

export type MicrosoftAuthConfig = {
  tenantId: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  mobileRedirectUris: string[];
  /** Restrict sign-in to these email domains (e.g. rcmp-grc.gc.ca). Empty = any. */
  allowedEmailDomains: string[];
};

export function getMicrosoftAuthConfig(): MicrosoftAuthConfig | null {
  loadServerEnv();
  const tenantId = process.env.AZURE_TENANT_ID?.trim();
  const clientId = process.env.AZURE_CLIENT_ID?.trim();
  const clientSecret = process.env.AZURE_CLIENT_SECRET?.trim();
  const redirectUri = process.env.AZURE_REDIRECT_URI?.trim();

  if (!tenantId || !clientId || !clientSecret || !redirectUri) {
    return null;
  }

  const domainsRaw = process.env.AZURE_ALLOWED_EMAIL_DOMAINS?.trim() ?? '';
  const allowedEmailDomains = domainsRaw
    ? domainsRaw.split(',').map((d) => d.trim().toLowerCase()).filter(Boolean)
    : [];

  const mobileRaw = process.env.AZURE_MOBILE_REDIRECT_URIS?.trim() ?? '';
  const mobileRedirectUris = mobileRaw
    ? mobileRaw.split(',').map((d) => d.trim()).filter(Boolean)
    : [];

  return {
    tenantId,
    clientId,
    clientSecret,
    redirectUri,
    mobileRedirectUris,
    allowedEmailDomains,
  };
}

export function resolveMicrosoftRedirectUri(
  config: MicrosoftAuthConfig,
  requested?: string | null,
): string {
  const trimmed = requested?.trim();
  if (trimmed) {
    const allowed = new Set([config.redirectUri, ...config.mobileRedirectUris]);
    if (!allowed.has(trimmed)) {
      throw new Error('The redirect URI is not authorized for this application.');
    }
    return trimmed;
  }
  return config.redirectUri;
}

export function microsoftAuthority(tenantId: string): string {
  return `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0`;
}
