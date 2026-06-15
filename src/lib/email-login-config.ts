/** Temporary dev-only email sign-in without password (user role). */

export function isEmailOnlyUserLoginEnabledForClient(): boolean {
  if (import.meta.env.VITE_ALLOW_EMAIL_ONLY_USER_LOGIN === 'true') return true;
  if (import.meta.env.VITE_ALLOW_EMAIL_ONLY_USER_LOGIN === 'false') return false;
  return import.meta.env.DEV;
}

export function isEmailOnlyUserLoginEnabled(): boolean {
  const flag = process.env.ALLOW_EMAIL_ONLY_USER_LOGIN?.trim();
  if (flag === 'true') return true;
  if (flag === 'false') return false;
  return process.env.NODE_ENV !== 'production';
}
