/** role table: 1=technician, 2=admin, 3=user */
export const ROLE_TECHNICIAN = 1;
export const ROLE_ADMIN = 2;
export const ROLE_USER = 3;

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

export function isAdminRole(roleId: number): boolean {
  return roleId === ROLE_ADMIN;
}

export function readAdminSession(): SessionUser | null {
  const user = readTechnicianSession();
  return user && isAdminRole(user.roleId) ? user : null;
}

export function hasAdminSession(): boolean {
  return readAdminSession() !== null;
}

export function persistSession(user: SessionUser): void {
  if (typeof window === 'undefined') return;
  const payload = JSON.stringify(user);
  if (isStaffRole(user.roleId)) {
    sessionStorage.setItem(TECHNICIAN_SESSION_KEY, payload);
    sessionStorage.removeItem(USER_SESSION_KEY);
  } else {
    sessionStorage.setItem(USER_SESSION_KEY, payload);
    sessionStorage.removeItem(TECHNICIAN_SESSION_KEY);
  }
}

export function readTechnicianSession(): SessionUser | null {
  if (typeof window === 'undefined') return null;
  const raw = sessionStorage.getItem(TECHNICIAN_SESSION_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as SessionUser;
    return isStaffRole(parsed.roleId) ? parsed : null;
  } catch {
    return null;
  }
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

export function clearAllSessions(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(TECHNICIAN_SESSION_KEY);
  sessionStorage.removeItem(USER_SESSION_KEY);
}

export function hasTechnicianSession(): boolean {
  return readTechnicianSession() !== null;
}
