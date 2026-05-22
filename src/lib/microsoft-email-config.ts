/** Server-only SMTP settings for Microsoft 365 / Outlook notification mail. Not stored in DB. */

export type MicrosoftEmailConfig = {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
  fromAddress: string;
  fromName: string;
};

const DEFAULT_HOST = 'smtp.office365.com';
const DEFAULT_PORT = 587;

export function isEmailConfigured(): boolean {
  return getMicrosoftEmailConfig() != null;
}

export function getMicrosoftEmailConfig(): MicrosoftEmailConfig | null {
  const user = process.env.SMTP_USER?.trim();
  const password = process.env.SMTP_PASSWORD?.trim();
  if (!user || !password) return null;

  const fromAddress = process.env.SMTP_FROM?.trim() || user;
  const host = process.env.SMTP_HOST?.trim() || DEFAULT_HOST;
  const portRaw = process.env.SMTP_PORT?.trim();
  const port = portRaw ? Number(portRaw) : DEFAULT_PORT;
  if (Number.isNaN(port) || port <= 0) return null;

  const secure =
    process.env.SMTP_SECURE === 'true' || process.env.SMTP_SECURE === '1' || port === 465;

  return {
    host,
    port,
    secure,
    user,
    password,
    fromAddress,
    fromName: process.env.SMTP_FROM_NAME?.trim() || 'NIMS',
  };
}
