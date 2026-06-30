import { isStaffRole } from '@/lib/auth-session';

export function assertStaffRole(roleId: number): void {
  if (!isStaffRole(roleId)) {
    throw new Error('Technician access required');
  }
}
