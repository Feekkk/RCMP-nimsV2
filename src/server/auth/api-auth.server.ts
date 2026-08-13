import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import type { RowDataPacket } from 'mysql2';
import { isAdminRole, isStaffRole } from '@/lib/auth-session';
import type { AuthUserRow } from '@/server/auth/auth-repo.server';
import { apiError } from '@/server/core/api-response.server';
import { assertAdminRole } from '@/server/auth/admin-auth.server';
import { assertStaffRole } from '@/server/auth/technician-auth.server';

const ACCESS_TTL_MS = 60 * 60 * 1000;
const REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000;

type TokenType = 'access' | 'refresh';

type TokenPayload = {
  sub: string;
  roleId: number;
  type: TokenType;
  exp: number;
  iat: number;
  jti: string;
};

export type ApiAuthContext = {
  staffId: string;
  roleId: number;
};

export type TokenPair = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
};

function jwtSecret(): string {
  const secret = process.env.API_JWT_SECRET?.trim();
  if (!secret) {
    throw new Error('API authentication is not configured. Set API_JWT_SECRET on the server.');
  }
  return secret;
}

function signToken(payload: TokenPayload): string {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = createHmac('sha256', jwtSecret()).update(body).digest('base64url');
  return `${body}.${sig}`;
}

function decodeToken(token: string, expectedType: TokenType): TokenPayload | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [body, sig] = parts;
  const expected = createHmac('sha256', jwtSecret()).update(body).digest('base64url');
  try {
    if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  } catch {
    return null;
  }
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as TokenPayload;
    if (payload.type !== expectedType) return null;
    if (typeof payload.exp !== 'number' || payload.exp <= Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

/** DB-backed revocation so it survives server restarts (refresh tokens live up to 30 days). */
async function isRefreshJtiRevoked(jti: string): Promise<boolean> {
  const { getDbPool } = await import('@/server/core/db');
  const pool = getDbPool();
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT jti FROM revoked_refresh_token WHERE jti = ? LIMIT 1`,
    [jti],
  );
  return rows.length > 0;
}

async function revokeRefreshJti(jti: string, expiresAtMs: number): Promise<void> {
  const { getDbPool } = await import('@/server/core/db');
  const pool = getDbPool();
  await pool.execute(
    `INSERT INTO revoked_refresh_token (jti, expires_at) VALUES (?, FROM_UNIXTIME(? / 1000))
     ON DUPLICATE KEY UPDATE expires_at = expires_at`,
    [jti, expiresAtMs],
  );
  await pool.execute(`DELETE FROM revoked_refresh_token WHERE expires_at < NOW()`);
}

async function verifyToken(token: string, expectedType: TokenType): Promise<TokenPayload | null> {
  const payload = decodeToken(token, expectedType);
  if (!payload) return null;
  if (expectedType === 'refresh' && (await isRefreshJtiRevoked(payload.jti))) return null;
  return payload;
}

export function issueTokenPair(user: AuthUserRow): TokenPair {
  const now = Date.now();
  const access: TokenPayload = {
    sub: user.staffId,
    roleId: user.roleId,
    type: 'access',
    iat: now,
    exp: now + ACCESS_TTL_MS,
    jti: randomBytes(12).toString('hex'),
  };
  const refresh: TokenPayload = {
    sub: user.staffId,
    roleId: user.roleId,
    type: 'refresh',
    iat: now,
    exp: now + REFRESH_TTL_MS,
    jti: randomBytes(16).toString('hex'),
  };
  return {
    accessToken: signToken(access),
    refreshToken: signToken(refresh),
    expiresIn: Math.floor(ACCESS_TTL_MS / 1000),
    tokenType: 'Bearer',
  };
}

export async function refreshAccessToken(refreshToken: string, user: AuthUserRow): Promise<TokenPair | null> {
  const payload = await verifyToken(refreshToken, 'refresh');
  if (!payload || payload.sub !== user.staffId) return null;
  await revokeRefreshJti(payload.jti, payload.exp);
  return issueTokenPair(user);
}

export async function revokeRefreshToken(refreshToken: string): Promise<void> {
  const payload = decodeToken(refreshToken, 'refresh');
  if (payload) await revokeRefreshJti(payload.jti, payload.exp);
}

export async function verifyRefreshTokenSubject(refreshToken: string): Promise<string | null> {
  const payload = await verifyToken(refreshToken, 'refresh');
  return payload?.sub ?? null;
}

export function parseBearerToken(request: Request): string | null {
  const auth = request.headers.get('authorization')?.trim();
  if (!auth?.startsWith('Bearer ')) return null;
  const token = auth.slice(7).trim();
  return token || null;
}

export async function requireAuth(request: Request): Promise<ApiAuthContext | Response> {
  const token = parseBearerToken(request);
  if (!token) return apiError('Authentication required.', 401, 'unauthorized');
  const payload = await verifyToken(token, 'access');
  if (!payload) return apiError('Invalid or expired access token.', 401, 'invalid_token');
  return { staffId: payload.sub, roleId: payload.roleId };
}

export async function requireStaff(request: Request): Promise<ApiAuthContext | Response> {
  const auth = await requireAuth(request);
  if (auth instanceof Response) return auth;
  try {
    assertStaffRole(auth.roleId);
  } catch (error) {
    return apiError(error instanceof Error ? error.message : 'Forbidden.', 403, 'forbidden');
  }
  return auth;
}

export async function requireAdmin(request: Request): Promise<ApiAuthContext | Response> {
  const auth = await requireAuth(request);
  if (auth instanceof Response) return auth;
  try {
    assertAdminRole(auth.roleId);
  } catch (error) {
    return apiError(error instanceof Error ? error.message : 'Forbidden.', 403, 'forbidden');
  }
  return auth;
}

export async function requireUser(request: Request): Promise<ApiAuthContext | Response> {
  const auth = await requireAuth(request);
  if (auth instanceof Response) return auth;
  if (isStaffRole(auth.roleId)) {
    return apiError('This endpoint is for user accounts only.', 403, 'forbidden');
  }
  return auth;
}

export function authUserPayload(user: AuthUserRow) {
  return {
    staffId: user.staffId,
    fullName: user.fullName,
    email: user.email,
    roleId: user.roleId,
    roleName: user.roleName,
    phone: user.phone,
    isStaff: isStaffRole(user.roleId),
    isAdmin: isAdminRole(user.roleId),
  };
}
