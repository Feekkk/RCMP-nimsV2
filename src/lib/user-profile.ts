import type { SessionUser } from '@/lib/auth-session';

export type UserProfileFields = Pick<SessionUser, 'fullName' | 'email' | 'phone'>;

export function isUserProfileComplete(user: UserProfileFields): boolean {
  return (
    user.fullName.trim().length > 0 &&
    user.email.trim().length > 0 &&
    Boolean(user.phone?.trim())
  );
}

export function missingUserProfileFields(user: UserProfileFields): string[] {
  const missing: string[] = [];
  if (!user.fullName.trim()) missing.push('Full name');
  if (!user.email.trim()) missing.push('Email');
  if (!user.phone?.trim()) missing.push('Phone number');
  return missing;
}
