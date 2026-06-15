/** Server-only Azure AD directory lookups via app-only (client credentials) Microsoft Graph. */

import { getMicrosoftAuthConfig, type MicrosoftAuthConfig } from '@/lib/microsoft-auth-config';

const NAME_CACHE_TTL_MS = 10 * 60 * 1000;
const TOKEN_SKEW_MS = 60 * 1000;
const OID_FILTER_CHUNK = 15;

type DirectoryUser = {
  oid: string;
  displayName: string | null;
  email: string | null;
  phone: string | null;
};

type GraphUser = {
  id: string;
  displayName?: string | null;
  mail?: string | null;
  userPrincipalName?: string | null;
};

let cachedToken: { value: string; expiresAt: number } | null = null;
const nameCache = new Map<string, { displayName: string; expiresAt: number }>();

function graphBaseUrl(): string {
  return (process.env.AZURE_GRAPH_API_URL?.trim() || 'https://graph.microsoft.com/v1.0').replace(/\/+$/, '');
}

function emailLocalPart(email: string | null | undefined): string {
  const raw = (email ?? '').trim();
  if (!raw) return '';
  const local = raw.split('@')[0]?.trim();
  return local || raw;
}

async function getGraphAppToken(config: MicrosoftAuthConfig): Promise<string> {
  if (cachedToken && cachedToken.expiresAt - TOKEN_SKEW_MS > Date.now()) {
    return cachedToken.value;
  }

  const body = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    grant_type: 'client_credentials',
    scope: 'https://graph.microsoft.com/.default',
  });

  const res = await fetch(`https://login.microsoftonline.com/${config.tenantId}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  const json = (await res.json()) as {
    access_token?: string;
    expires_in?: number;
    error?: string;
    error_description?: string;
  };

  if (!res.ok || json.error || !json.access_token) {
    throw new Error(json.error_description ?? json.error ?? 'Microsoft Graph token request failed');
  }

  cachedToken = {
    value: json.access_token,
    expiresAt: Date.now() + (json.expires_in ?? 3600) * 1000,
  };
  return cachedToken.value;
}

function escapeODataLiteral(value: string): string {
  return value.replace(/'/g, "''");
}

async function graphGet<T>(path: string, token: string): Promise<T> {
  const res = await fetch(`${graphBaseUrl()}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      ConsistencyLevel: 'eventual',
    },
  });
  if (!res.ok) {
    throw new Error(`Microsoft Graph request failed (${res.status})`);
  }
  return (await res.json()) as T;
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}

/**
 * Resolve display names for a set of Azure object ids. Results are cached in-memory.
 * Falls back to the email local-part (when provided) and finally the oid if Graph is unavailable.
 */
export async function getDisplayNamesByOids(
  oids: (string | null | undefined)[],
  fallbackByOid?: Map<string, string>,
): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  const unique = Array.from(
    new Set(oids.map((o) => o?.trim()).filter((o): o is string => Boolean(o))),
  );
  if (unique.length === 0) return result;

  const now = Date.now();
  const pending: string[] = [];
  for (const oid of unique) {
    const cached = nameCache.get(oid);
    if (cached && cached.expiresAt > now) {
      result.set(oid, cached.displayName);
    } else {
      pending.push(oid);
    }
  }

  if (pending.length > 0) {
    const config = getMicrosoftAuthConfig();
    if (config) {
      try {
        const token = await getGraphAppToken(config);
        for (const group of chunk(pending, OID_FILTER_CHUNK)) {
          const filter = group.map((oid) => `'${escapeODataLiteral(oid)}'`).join(',');
          const data = await graphGet<{ value: GraphUser[] }>(
            `/users?$select=id,displayName,mail,userPrincipalName&$filter=id in (${encodeURIComponent(filter)})`,
            token,
          );
          for (const u of data.value ?? []) {
            const name = (u.displayName ?? '').trim() || emailLocalPart(u.mail ?? u.userPrincipalName);
            if (u.id && name) {
              nameCache.set(u.id, { displayName: name, expiresAt: Date.now() + NAME_CACHE_TTL_MS });
              result.set(u.id, name);
            }
          }
        }
      } catch {
        // Graph unavailable — fall through to fallbacks below.
      }
    }
  }

  for (const oid of unique) {
    if (!result.has(oid)) {
      const fallback = fallbackByOid?.get(oid)?.trim();
      result.set(oid, fallback || oid);
    }
  }

  return result;
}

/**
 * Mutates rows in place: resolves each row's oid (oidKey) to a display name (nameKey) from Azure.
 * Keeps downstream mapping code unchanged when a query swaps users.full_name for users.oid.
 */
export async function attachDisplayNames<T extends Record<string, unknown>>(
  rows: T[],
  oidKey: keyof T,
  nameKey: keyof T,
): Promise<void> {
  if (rows.length === 0) return;
  const oids = rows.map((r) => r[oidKey] as string | null | undefined);
  const names = await getDisplayNamesByOids(oids);
  for (const row of rows) {
    const oid = row[oidKey] as string | null | undefined;
    (row[nameKey] as unknown) = (oid ? names.get(oid.trim()) : null) ?? '';
  }
}

export async function getDisplayNameByOid(
  oid: string | null | undefined,
  fallbackEmail?: string | null,
): Promise<string> {
  const trimmed = oid?.trim();
  const fallback = emailLocalPart(fallbackEmail);
  if (!trimmed) return fallback;
  const map = await getDisplayNamesByOids(
    [trimmed],
    fallback ? new Map([[trimmed, fallback]]) : undefined,
  );
  return map.get(trimmed) ?? (fallback || trimmed);
}

function mapGraphUser(u: GraphUser & { mobilePhone?: string | null; businessPhones?: string[] }): DirectoryUser {
  const phone =
    (u.mobilePhone ?? '').trim() ||
    (u.businessPhones?.find((p) => p?.trim()) ?? '').trim() ||
    null;
  return {
    oid: u.id,
    displayName: (u.displayName ?? '').trim() || null,
    email: (u.mail ?? u.userPrincipalName ?? null)?.toLowerCase() ?? null,
    phone: phone || null,
  };
}

/** Look up a directory user by Azure object id (oid). */
export async function getDirectoryUserByOid(oid: string): Promise<DirectoryUser | null> {
  const trimmed = oid.trim();
  if (!trimmed) return null;

  const config = getMicrosoftAuthConfig();
  if (!config) return null;

  try {
    const token = await getGraphAppToken(config);
    const u = await graphGet<GraphUser & { mobilePhone?: string | null; businessPhones?: string[] }>(
      `/users/${encodeURIComponent(trimmed)}?$select=id,displayName,mail,userPrincipalName,mobilePhone,businessPhones`,
      token,
    );
    if (!u?.id) return null;
    return mapGraphUser(u);
  } catch {
    return null;
  }
}

/** Look up a directory user by email (mail or userPrincipalName); used for pre-provision + oid binding. */
export async function getDirectoryUserByEmail(email: string): Promise<DirectoryUser | null> {
  const normalized = email.trim().toLowerCase();
  if (!normalized || !normalized.includes('@')) return null;

  const config = getMicrosoftAuthConfig();
  if (!config) return null;

  try {
    const token = await getGraphAppToken(config);
    const literal = escapeODataLiteral(normalized);
    const filter = encodeURIComponent(`mail eq '${literal}' or userPrincipalName eq '${literal}'`);
    const data = await graphGet<{ value: (GraphUser & { mobilePhone?: string | null; businessPhones?: string[] })[] }>(
      `/users?$select=id,displayName,mail,userPrincipalName,mobilePhone,businessPhones&$filter=${filter}`,
      token,
    );
    const u = data.value?.[0];
    if (!u?.id) return null;
    return mapGraphUser(u);
  } catch {
    return null;
  }
}
