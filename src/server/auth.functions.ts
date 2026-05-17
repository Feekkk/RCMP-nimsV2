import { createServerFn } from '@tanstack/react-start';

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
