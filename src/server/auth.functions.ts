import { createServerFn } from '@tanstack/react-start';

export const getMicrosoftLoginUrlFn = createServerFn({ method: 'POST' }).handler(async () => {
  const { getMicrosoftLoginRedirect } = await import('@/server/microsoft-auth.server');
  return getMicrosoftLoginRedirect();
});

export const completeMicrosoftLoginFn = createServerFn({ method: 'POST' })
  .inputValidator((data: { code: string; state: string }) => data)
  .handler(async ({ data }) => {
    const { completeMicrosoftLogin } = await import('@/server/microsoft-auth.server');
    return completeMicrosoftLogin(data.code, data.state);
  });

export const loginDevByEmailFn = createServerFn({ method: 'POST' })
  .inputValidator((data: { email: string; loginRole: 'user' | 'staff' }) => data)
  .handler(async ({ data }) => {
    const { isEmailOnlyUserLoginEnabled } = await import('@/lib/email-login-config');
    if (!isEmailOnlyUserLoginEnabled()) {
      throw new Error('Dev email sign-in is not enabled on this server.');
    }
    const { loginDevByEmail } = await import('@/server/auth-repo.server');
    return loginDevByEmail(data.email, data.loginRole);
  });

export const getUserProfileFn = createServerFn({ method: 'POST' })
  .inputValidator((data: { staffId: string }) => data)
  .handler(async ({ data }) => {
    const { getUserProfile } = await import('@/server/auth-repo.server');
    return getUserProfile(data.staffId);
  });

export const updateUserProfileFn = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: {
      staffId: string;
      fullName: string;
      email: string;
      phone: string | null;
      password?: string;
    }) => data,
  )
  .handler(async ({ data }) => {
    const { updateUserProfile } = await import('@/server/auth-repo.server');
    return updateUserProfile(data);
  });

export const getStaffProfileFn = createServerFn({ method: 'POST' })
  .inputValidator((data: { staffId: string }) => data)
  .handler(async ({ data }) => {
    const { getStaffProfile } = await import('@/server/auth-repo.server');
    return getStaffProfile(data.staffId);
  });

export const updateStaffProfileFn = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: {
      staffId: string;
      fullName: string;
      email: string;
      phone: string | null;
      password?: string;
    }) => data,
  )
  .handler(async ({ data }) => {
    const { updateStaffProfile } = await import('@/server/auth-repo.server');
    return updateStaffProfile(data);
  });
