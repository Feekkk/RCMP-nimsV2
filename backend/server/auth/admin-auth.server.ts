import { ROLE_ADMIN } from '@shared/lib/auth-session';

export function assertAdminRole(roleId: number): void {
  if (roleId !== ROLE_ADMIN) {
    throw new Error('Administrator access is required. Sign in with an administrator account to continue.');
  }
}
