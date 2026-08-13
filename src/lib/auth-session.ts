export const ROLE_TECHNICIAN = 1;
export const ROLE_ADMIN = 2;
export const ROLE_USER = 3;
export const ROLE_DISPOSAL_UNIT = 4;

export const TECHNICIAN_SESSION_KEY = 'nims-technician-session';
export const USER_SESSION_KEY = 'nims-user-session';

export type SessionUser = {
  staffId: string;
  fullName: string;
  email: string;
  roleId: number;
  roleName: string;
  phone: string | null;
};

export function isStaffRole(roleId: number): boolean {
  return roleId === ROLE_TECHNICIAN || roleId === ROLE_ADMIN;
}

export function isDisposalUnitRole(roleId: number): boolean {
  return roleId === ROLE_DISPOSAL_UNIT;
}

export function isAdminRole(roleId: number): boolean {
  return roleId === ROLE_ADMIN;
}

function isPrivilegedSessionRole(roleId: number): boolean {
  return isStaffRole(roleId) || isDisposalUnitRole(roleId);
}

export function getPostLoginPath(roleId: number): string {
  if (isAdminRole(roleId)) return '/admin/dashboard';
  if (isDisposalUnitRole(roleId)) return '/disposal-unit/dashboard';
  if (roleId === ROLE_TECHNICIAN) return '/technician/dashboard';
  return '/user/request';
}

export function readAdminSession(): SessionUser | null {
  const user = readPrivilegedSession();
  return user && isAdminRole(user.roleId) ? user : null;
}

export function hasAdminSession(): boolean {
  return readAdminSession() !== null;
}

export function persistSession(user: SessionUser): void {
  if (typeof window === 'undefined') return;
  const payload = JSON.stringify(user);
  if (isPrivilegedSessionRole(user.roleId)) {
    sessionStorage.setItem(TECHNICIAN_SESSION_KEY, payload);
    sessionStorage.removeItem(USER_SESSION_KEY);
  } else {
    sessionStorage.setItem(USER_SESSION_KEY, payload);
    sessionStorage.removeItem(TECHNICIAN_SESSION_KEY);
  }
}

export function readPrivilegedSession(): SessionUser | null {
  if (typeof window === 'undefined') return null;
  const raw = sessionStorage.getItem(TECHNICIAN_SESSION_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as SessionUser;
    return isPrivilegedSessionRole(parsed.roleId) ? parsed : null;
  } catch {
    return null;
  }
}

export function readTechnicianSession(): SessionUser | null {
  const user = readPrivilegedSession();
  return user && isStaffRole(user.roleId) ? user : null;
}

export function readDisposalUnitSession(): SessionUser | null {
  const user = readPrivilegedSession();
  return user && isDisposalUnitRole(user.roleId) ? user : null;
}

export function readUserSession(): SessionUser | null {
  if (typeof window === 'undefined') return null;
  const raw = sessionStorage.getItem(USER_SESSION_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as SessionUser;
    return parsed.roleId === ROLE_USER ? parsed : null;
  } catch {
    return null;
  }
}

/** Clears the local UI cache and the server-side session cookie. */
export async function clearAllSessions(): Promise<void> {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(TECHNICIAN_SESSION_KEY);
  sessionStorage.removeItem(USER_SESSION_KEY);
  try {
    const { logoutFn } = await import('@/server/auth/auth.functions');
    await logoutFn();
  } catch {
    // no-op
  }
}

export function hasTechnicianSession(): boolean {
  return readTechnicianSession() !== null;
}

export function hasDisposalUnitSession(): boolean {
  return readDisposalUnitSession() !== null;
}
