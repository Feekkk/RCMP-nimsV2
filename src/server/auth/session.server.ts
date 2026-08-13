import { useSession } from '@tanstack/react-start/server';
import type { AuthUserRow } from '@/server/auth/auth-repo.server';
import { loadServerEnv } from '@/server/core/env.server';

const SESSION_NAME = 'nims_session';
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 12;

export type AppSessionData = {
  staffId: string;
  roleId: number;
  roleName: string;
  fullName: string;
  email: string;
  phone: string | null;
};

function sessionSecret(): string {
  loadServerEnv();
  const secret = process.env.SESSION_SECRET?.trim();
  if (!secret) {
    throw new Error('Session storage is not configured. Set SESSION_SECRET on the server.');
  }
  if (secret.length < 32) {
    throw new Error('SESSION_SECRET must be at least 32 characters long.');
  }
  return secret;
}

/** Server-side, HttpOnly, encrypted+signed session cookie. Never trust client-supplied identity. */
export function getAppSession() {
  // eslint-disable-next-line react-hooks/rules-of-hooks -- `useSession` here is h3's server session helper, not a React hook.
  return useSession<AppSessionData>({
    name: SESSION_NAME,
    password: sessionSecret(),
    maxAge: SESSION_MAX_AGE_SECONDS,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    },
  });
}

export async function establishSession(user: AuthUserRow): Promise<void> {
  const session = await getAppSession();
  const data: AppSessionData = {
    staffId: user.staffId,
    roleId: user.roleId,
    roleName: user.roleName,
    fullName: user.fullName,
    email: user.email,
    phone: user.phone,
  };
  await session.update(data);
}

export async function destroySession(): Promise<void> {
  const session = await getAppSession();
  await session.clear();
}

export async function getSessionUser(): Promise<AppSessionData | null> {
  const session = await getAppSession();
  const { staffId, roleId, roleName, fullName, email, phone } = session.data;
  if (!staffId || typeof roleId !== 'number') return null;
  return { staffId, roleId, roleName: roleName ?? '', fullName: fullName ?? '', email: email ?? '', phone: phone ?? null };
}
