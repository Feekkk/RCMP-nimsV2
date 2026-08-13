import { createMiddleware } from '@tanstack/react-start';
import { isAdminRole, isDisposalUnitRole, isStaffRole } from '@/lib/auth-session';

export type SessionContext = {
  staffId: string;
  roleId: number;
};

/** Base guard: any signed-in account. Reads identity from the server-side session cookie only. */
export const sessionMiddleware = createMiddleware({ type: 'function' }).server(
  async ({ next }) => {
    const { getSessionUser } = await import('@/server/auth/session.server');
    const session = await getSessionUser();
    if (!session) {
      throw new Error('Your session has expired. Sign in again to continue.');
    }
    return next({ context: { staffId: session.staffId, roleId: session.roleId } as SessionContext });
  },
);

/** Technician or administrator accounts only. */
export const staffMiddleware = createMiddleware({ type: 'function' })
  .middleware([sessionMiddleware])
  .server(async ({ next, context }) => {
    if (!isStaffRole(context.roleId)) {
      throw new Error('Technician access is required. Sign in with a technician account to continue.');
    }
    return next();
  });

/** Administrator accounts only. */
export const adminMiddleware = createMiddleware({ type: 'function' })
  .middleware([sessionMiddleware])
  .server(async ({ next, context }) => {
    if (!isAdminRole(context.roleId)) {
      throw new Error('Administrator access is required. Sign in with an administrator account to continue.');
    }
    return next();
  });

/** Disposal unit accounts only. */
export const disposalUnitMiddleware = createMiddleware({ type: 'function' })
  .middleware([sessionMiddleware])
  .server(async ({ next, context }) => {
    if (!isDisposalUnitRole(context.roleId)) {
      throw new Error('Disposal unit access is required. Sign in with a disposal unit account to continue.');
    }
    return next();
  });

/** "Requester" accounts only (not staff or disposal unit) — mirrors the mobile API's requireUser guard. */
export const requesterMiddleware = createMiddleware({ type: 'function' })
  .middleware([sessionMiddleware])
  .server(async ({ next, context }) => {
    if (isStaffRole(context.roleId) || isDisposalUnitRole(context.roleId)) {
      throw new Error('This action is for user accounts only.');
    }
    return next();
  });
