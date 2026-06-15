/** Server-only Microsoft Entra ID (Azure AD) OAuth settings. */

export type MicrosoftAuthConfig = {
  tenantId: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  /** Restrict sign-in to these email domains (e.g. rcmp-grc.gc.ca). Empty = any. */
  allowedEmailDomains: string[];
};

export function isMicrosoftSsoEnabled(): boolean {
  return getMicrosoftAuthConfig() != null;
}

/** True when the login page should show Microsoft sign-in (default on unless explicitly disabled). */
export function isMicrosoftSsoEnabledForClient(): boolean {
  if (import.meta.env.VITE_MICROSOFT_SSO_ENABLED === 'false') return false;
  return true;
}

export function getMicrosoftAuthConfig(): MicrosoftAuthConfig | null {
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

export function microsoftAuthority(tenantId: string): string {
  return `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0`;
}
