import { createServerFn } from '@tanstack/react-start';

export const getMicrosoftLoginUrlFn = createServerFn({ method: 'GET' }).handler(async () => {
  const { getMicrosoftLoginRedirect } = await import('@/server/microsoft-auth.server');
  return getMicrosoftLoginRedirect();
});

export const completeMicrosoftLoginFn = createServerFn({ method: 'POST' })
  .inputValidator((data: { code: string; state: string }) => data)
  .handler(async ({ data }) => {
    const { completeMicrosoftLogin } = await import('@/server/microsoft-auth.server');
    return completeMicrosoftLogin(data.code, data.state);
  });

export const loginStaffFn = createServerFn({ method: 'POST' })
  .inputValidator((data: { staffId: string; password: string }) => data)
  .handler(async ({ data }) => {
    const { loginStaff } = await import('@/server/auth-repo.server');
    return loginStaff(data.staffId, data.password);
  });

export const loginUserFn = createServerFn({ method: 'POST' })
  .inputValidator((data: { email: string; password: string }) => data)
  .handler(async ({ data }) => {
    const { loginUser } = await import('@/server/auth-repo.server');
    return loginUser(data.email, data.password);
  });

export const registerUserFn = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: { staffId: string; fullName: string; email: string; password: string; phone?: string }) => data,
  )
  .handler(async ({ data }) => {
    const { registerUser } = await import('@/server/auth-repo.server');
    return registerUser({
      staffId: data.staffId,
      fullName: data.fullName,
      email: data.email,
      password: data.password,
      phone: data.phone,
    });
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
