import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { isAdminRole, isStaffRole } from '@/lib/auth-session';
import type { AuthUserRow } from '@/server/auth-repo.server';
import { apiError } from '@/server/api-response.server';
import { assertAdminRole } from '@/server/admin-auth.server';
import { assertStaffRole } from '@/server/technician-auth.server';

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

const revokedRefreshJtis = new Set<string>();

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

function verifyToken(token: string, expectedType: TokenType): TokenPayload | null {
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
    if (expectedType === 'refresh' && revokedRefreshJtis.has(payload.jti)) return null;
    return payload;
  } catch {
    return null;
  }
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

export function refreshAccessToken(refreshToken: string, user: AuthUserRow): TokenPair | null {
  const payload = verifyToken(refreshToken, 'refresh');
  if (!payload || payload.sub !== user.staffId) return null;
  revokedRefreshJtis.add(payload.jti);
  return issueTokenPair(user);
}

export function revokeRefreshToken(refreshToken: string): void {
  const payload = verifyToken(refreshToken, 'refresh');
  if (payload) revokedRefreshJtis.add(payload.jti);
}

export function verifyRefreshTokenSubject(refreshToken: string): string | null {
  const payload = verifyToken(refreshToken, 'refresh');
  return payload?.sub ?? null;
}

export function parseBearerToken(request: Request): string | null {
  const auth = request.headers.get('authorization')?.trim();
  if (!auth?.startsWith('Bearer ')) return null;
  const token = auth.slice(7).trim();
  return token || null;
}

export function requireAuth(request: Request): ApiAuthContext | Response {
  const token = parseBearerToken(request);
  if (!token) return apiError('Authentication required.', 401, 'unauthorized');
  const payload = verifyToken(token, 'access');
  if (!payload) return apiError('Invalid or expired access token.', 401, 'invalid_token');
  return { staffId: payload.sub, roleId: payload.roleId };
}

export function requireStaff(request: Request): ApiAuthContext | Response {
  const auth = requireAuth(request);
  if (auth instanceof Response) return auth;
  try {
    assertStaffRole(auth.roleId);
  } catch (error) {
    return apiError(error instanceof Error ? error.message : 'Forbidden.', 403, 'forbidden');
  }
  return auth;
}

export function requireAdmin(request: Request): ApiAuthContext | Response {
  const auth = requireAuth(request);
  if (auth instanceof Response) return auth;
  try {
    assertAdminRole(auth.roleId);
  } catch (error) {
    return apiError(error instanceof Error ? error.message : 'Forbidden.', 403, 'forbidden');
  }
  return auth;
}

export function requireUser(request: Request): ApiAuthContext | Response {
  const auth = requireAuth(request);
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
