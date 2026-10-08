import { loadServerEnv } from '@backend/server/core/env.server';

/** Server-only Microsoft Entra ID (Azure AD) OAuth settings. */
export type MicrosoftAuthConfig = {
  tenantId: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
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

  return {
    tenantId,
    clientId,
    clientSecret,
    redirectUri,
    allowedEmailDomains,
  };
}

/// Construct the Microsoft Entra ID (Azure AD) authority URL for a given tenant.
export function microsoftAuthority(tenantId: string): string {
  return `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0`;
}
