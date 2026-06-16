import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import '@/server/env.server';
import {
  getMicrosoftAuthConfig,
  listMissingMicrosoftAuthEnv,
  microsoftAuthority,
  type MicrosoftAuthConfig,
} from '@/lib/microsoft-auth-config';
import { loginMicrosoftUser, type MicrosoftLoginResult } from '@/server/auth-repo.server';

const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;
const SCOPES = ['openid', 'profile', 'email', 'offline_access', 'User.Read'];

type OAuthStatePayload = {
  nonce: string;
  exp: number;
};

type TokenResponse = {
  access_token?: string;
  id_token?: string;
  token_type?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
};

type GraphMe = {
  id: string;
  displayName?: string;
  mail?: string | null;
  userPrincipalName?: string;
};

function stateSecret(config: MicrosoftAuthConfig): string {
  return config.clientSecret;
}

export function createMicrosoftOAuthState(config: MicrosoftAuthConfig): string {
  const payload: OAuthStatePayload = {
    nonce: randomBytes(16).toString('hex'),
    exp: Date.now() + OAUTH_STATE_TTL_MS,
  };
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = createHmac('sha256', stateSecret(config)).update(body).digest('base64url');
  return `${body}.${sig}`;
}

export function verifyMicrosoftOAuthState(config: MicrosoftAuthConfig, state: string): boolean {
  const parts = state.split('.');
  if (parts.length !== 2) return false;
  const [body, sig] = parts;
  const expected = createHmac('sha256', stateSecret(config)).update(body).digest('base64url');
  try {
    if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return false;
  } catch {
    return false;
  }
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as OAuthStatePayload;
    return typeof payload.exp === 'number' && payload.exp > Date.now();
  } catch {
    return false;
  }
}

export function buildMicrosoftAuthorizeUrl(config: MicrosoftAuthConfig, state: string): string {
  const params = new URLSearchParams({
    client_id: config.clientId,
    response_type: 'code',
    redirect_uri: config.redirectUri,
    response_mode: 'query',
    scope: SCOPES.join(' '),
    state,
    prompt: 'select_account',
  });
  return `${microsoftAuthority(config.tenantId)}/authorize?${params.toString()}`;
}

async function exchangeCodeForTokens(
  config: MicrosoftAuthConfig,
  code: string,
): Promise<TokenResponse> {
  const body = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    code,
    redirect_uri: config.redirectUri,
    grant_type: 'authorization_code',
    scope: SCOPES.join(' '),
  });

  const res = await fetch(`${microsoftAuthority(config.tenantId)}/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  const json = (await res.json()) as TokenResponse;
  if (!res.ok || json.error) {
    throw new Error(json.error_description ?? json.error ?? 'Microsoft token exchange failed');
  }
  if (!json.access_token) {
    throw new Error('Microsoft did not return an access token');
  }
  return json;
}

async function fetchGraphProfile(accessToken: string): Promise<GraphMe> {
  const res = await fetch(
    'https://graph.microsoft.com/v1.0/me?$select=id,displayName,mail,userPrincipalName',
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );
  if (!res.ok) {
    throw new Error('Could not read your Microsoft profile');
  }
  return (await res.json()) as GraphMe;
}

function resolveEmail(profile: GraphMe, allowedDomains: string[]): string {
  const raw = (profile.mail ?? profile.userPrincipalName ?? '').trim().toLowerCase();
  if (!raw || !raw.includes('@')) {
    throw new Error('Microsoft account has no email address');
  }
  if (allowedDomains.length > 0) {
    const domain = raw.split('@')[1] ?? '';
    if (!allowedDomains.includes(domain)) {
      throw new Error('Your organization email is not allowed for this application');
    }
  }
  return raw;
}

function assertMicrosoftAuthConfig(): MicrosoftAuthConfig {
  const config = getMicrosoftAuthConfig();
  if (!config) {
    const missing = listMissingMicrosoftAuthEnv();
    throw new Error(
      missing.length > 0
        ? `Microsoft SSO is not configured — add to .env (not .env.example): ${missing.join(', ')}`
        : 'Microsoft SSO is not configured on this server',
    );
  }
  return config;
}

export function getMicrosoftLoginRedirect(): { url: string; state: string } {
  const config = assertMicrosoftAuthConfig();
  const state = createMicrosoftOAuthState(config);
  return { url: buildMicrosoftAuthorizeUrl(config, state), state };
}

function parseOAuthStatePayload(config: MicrosoftAuthConfig, state: string): OAuthStatePayload | null {
  if (!verifyMicrosoftOAuthState(config, state)) return null;
  const parts = state.split('.');
  if (parts.length !== 2) return null;
  try {
    return JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8')) as OAuthStatePayload;
  } catch {
    return null;
  }
}

export async function completeMicrosoftLogin(code: string, state: string): Promise<MicrosoftLoginResult> {
  const config = assertMicrosoftAuthConfig();
  const statePayload = parseOAuthStatePayload(config, state);
  if (!statePayload) {
    throw new Error('Invalid or expired sign-in session. Please try again.');
  }

  const tokens = await exchangeCodeForTokens(config, code);
  const profile = await fetchGraphProfile(tokens.access_token!);
  const email = resolveEmail(profile, config.allowedEmailDomains);

  return loginMicrosoftUser({
    entraOid: profile.id,
    email,
  });
}
