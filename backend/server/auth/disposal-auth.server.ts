import { isDisposalUnitRole } from '@shared/lib/auth-session';

export function assertDisposalUnitRole(roleId: number): void {
  if (!isDisposalUnitRole(roleId)) {
    throw new Error('Disposal unit access is required. Sign in with a disposal unit account to continue.');
  }
}
