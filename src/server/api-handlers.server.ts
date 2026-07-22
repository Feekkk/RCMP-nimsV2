import { isStaffRole } from '@/lib/auth-session';
import type { AssetKind } from '@/lib/inventory-schema';
import {
  authUserPayload,
  issueTokenPair,
  refreshAccessToken,
  requireAdmin,
  requireAuth,
  requireStaff,
  requireUser,
  revokeRefreshToken,
} from '@/server/api-auth.server';
import { apiError, apiOk, handleApiError, readJsonBody } from '@/server/api-response.server';

type MicrosoftStartBody = {
  redirectUri?: string;
};

type MicrosoftTokenBody = {
  code: string;
  state: string;
  redirectUri?: string;
};

type RefreshBody = {
  refreshToken: string;
};

type DevLoginBody = {
  role?: 'technician' | 'admin' | 'user';
};

export async function handleMicrosoftStart(request: Request): Promise<Response> {
  try {
    const body = request.method === 'POST' ? await readJsonBody<MicrosoftStartBody>(request) : null;
    const redirectUri = body && !(body instanceof Response) ? body.redirectUri : undefined;
    const { getMicrosoftLoginRedirect } = await import('@/server/microsoft-auth.server');
    const result = getMicrosoftLoginRedirect(redirectUri);
    return apiOk(result);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function handleMicrosoftToken(request: Request): Promise<Response> {
  try {
    const body = await readJsonBody<MicrosoftTokenBody>(request);
    if (body instanceof Response) return body;
    if (!body.code?.trim() || !body.state?.trim()) {
      return apiError('code and state are required.', 422, 'validation_error');
    }
    const { completeMicrosoftLogin } = await import('@/server/microsoft-auth.server');
    const user = await completeMicrosoftLogin(body.code.trim(), body.state.trim(), body.redirectUri);
    const tokens = issueTokenPair(user);
    return apiOk({
      ...tokens,
      user: authUserPayload(user),
      accountCreated: user.accountCreated,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function handleRefresh(request: Request): Promise<Response> {
  try {
    const body = await readJsonBody<RefreshBody>(request);
    if (body instanceof Response) return body;
    if (!body.refreshToken?.trim()) {
      return apiError('refreshToken is required.', 422, 'validation_error');
    }
    const { getAuthUserByStaffId } = await import('@/server/auth-repo.server');
    const { verifyRefreshTokenSubject } = await import('@/server/api-auth.server');
    const staffId = verifyRefreshTokenSubject(body.refreshToken.trim());
    if (!staffId) return apiError('Invalid or expired refresh token.', 401, 'invalid_token');
    const user = await getAuthUserByStaffId(staffId);
    if (!user) return apiError('Account not found.', 401, 'invalid_token');
    const tokens = refreshAccessToken(body.refreshToken.trim(), user);
    if (!tokens) return apiError('Invalid or expired refresh token.', 401, 'invalid_token');
    return apiOk({ ...tokens, user: authUserPayload(user) });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function handleMe(request: Request): Promise<Response> {
  try {
    const auth = requireAuth(request);
    if (auth instanceof Response) return auth;
    const { getAuthUserByStaffId } = await import('@/server/auth-repo.server');
    const user = await getAuthUserByStaffId(auth.staffId);
    if (!user) return apiError('Account not found.', 404, 'not_found');
    return apiOk(authUserPayload(user));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function handleLogout(request: Request): Promise<Response> {
  try {
    const body = await readJsonBody<RefreshBody>(request);
    if (body instanceof Response) return body;
    if (body.refreshToken?.trim()) revokeRefreshToken(body.refreshToken.trim());
    return apiOk({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function handleDevLogin(request: Request): Promise<Response> {
  if (process.env.NODE_ENV === 'production') {
    return apiError('Development sign-in is not available.', 403, 'forbidden');
  }
  try {
    const body = await readJsonBody<DevLoginBody>(request);
    if (body instanceof Response) return body;
    const role = body.role ?? 'technician';
    const { devLoginAsTechnician, devLoginAsAdmin, devLoginAsUser } = await import(
      '@/server/auth-repo.server'
    );
    let user;
    if (role === 'admin') user = await devLoginAsAdmin();
    else if (role === 'technician') user = await devLoginAsTechnician();
    else user = await devLoginAsUser();
    const tokens = issueTokenPair(user);
    return apiOk({ ...tokens, user: authUserPayload(user) });
  } catch (error) {
    return handleApiError(error);
  }
}

type ProfilePatchBody = {
  fullName: string;
  email: string;
  phone: string | null;
};

export async function handleGetProfile(request: Request): Promise<Response> {
  try {
    const auth = requireAuth(request);
    if (auth instanceof Response) return auth;
    const { getStaffProfile, getUserProfile } = await import('@/server/auth-repo.server');
    const profile = isStaffRole(auth.roleId)
      ? await getStaffProfile(auth.staffId)
      : await getUserProfile(auth.staffId);
    return apiOk(profile);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function handlePatchProfile(request: Request): Promise<Response> {
  try {
    const auth = requireAuth(request);
    if (auth instanceof Response) return auth;
    const body = await readJsonBody<ProfilePatchBody>(request);
    if (body instanceof Response) return body;
    const { updateStaffProfile, updateUserProfile } = await import('@/server/auth-repo.server');
    const input = {
      staffId: auth.staffId,
      fullName: body.fullName,
      email: body.email,
      phone: body.phone,
    };
    const profile = isStaffRole(auth.roleId)
      ? await updateStaffProfile(input)
      : await updateUserProfile(input);
    return apiOk(profile);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function handleDashboard(request: Request): Promise<Response> {
  try {
    const auth = requireStaff(request);
    if (auth instanceof Response) return auth;
    const url = new URL(request.url);
    const year = Number(url.searchParams.get('year'));
    const month = Number(url.searchParams.get('month'));
    const now = new Date();
    const { getTechnicianDashboard } = await import('@/server/dashboard-repo.server');
    const data = await getTechnicianDashboard({
      year: Number.isFinite(year) ? year : now.getFullYear(),
      month: Number.isFinite(month) ? month : now.getMonth() + 1,
    });
    return apiOk(data);
  } catch (error) {
    return handleApiError(error);
  }
}

function parseAssetKind(raw: string | null): AssetKind | Response {
  if (raw === 'laptop' || raw === 'av' || raw === 'network') return raw;
  return apiError('kind must be laptop, av, or network.', 422, 'validation_error');
}

export async function handleListAssets(request: Request): Promise<Response> {
  try {
    const auth = requireStaff(request);
    if (auth instanceof Response) return auth;
    const kind = parseAssetKind(new URL(request.url).searchParams.get('kind'));
    if (kind instanceof Response) return kind;
    const { listAssets } = await import('@/server/assets-repo.server');
    return apiOk(await listAssets(kind));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function handleAssetLookup(request: Request): Promise<Response> {
  try {
    const auth = requireStaff(request);
    if (auth instanceof Response) return auth;
    const code = new URL(request.url).searchParams.get('code')?.trim();
    if (!code) return apiError('code query parameter is required.', 422, 'validation_error');
    const { findAssetByCode } = await import('@/server/assets-repo.server');
    const asset = await findAssetByCode(code);
    if (!asset) return apiError('No asset found for that code.', 404, 'not_found');
    return apiOk(asset);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function handleAssetDetail(
  request: Request,
  kind: AssetKind,
  assetId: number,
): Promise<Response> {
  try {
    const auth = requireStaff(request);
    if (auth instanceof Response) return auth;
    const { getAssetDetail } = await import('@/server/assets-repo.server');
    const asset = await getAssetDetail(kind, assetId);
    if (!asset) return apiError('Asset not found.', 404, 'not_found');
    return apiOk(asset);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function handleListStaff(request: Request): Promise<Response> {
  try {
    const auth = requireStaff(request);
    if (auth instanceof Response) return auth;
    const { listStaffDirectory } = await import('@/server/staff-repo.server');
    return apiOk(await listStaffDirectory());
  } catch (error) {
    return handleApiError(error);
  }
}

export async function handleUserRequests(request: Request): Promise<Response> {
  try {
    const auth = requireUser(request);
    if (auth instanceof Response) return auth;
    const { listUserRequestHistory } = await import('@/server/request-repo.server');
    return apiOk(await listUserRequestHistory(auth.staffId));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function handleSubmitRequest(request: Request): Promise<Response> {
  try {
    const auth = requireUser(request);
    if (auth instanceof Response) return auth;
    const body = await readJsonBody<Record<string, unknown>>(request);
    if (body instanceof Response) return body;
    const { submitUserRequest } = await import('@/server/request-repo.server');
    const result = await submitUserRequest({
      requestedBy: auth.staffId,
      borrowDate: String(body.borrowDate ?? ''),
      returnDate: String(body.returnDate ?? ''),
      programType: String(body.programType ?? ''),
      usageLocation: String(body.usageLocation ?? ''),
      remarks: body.remarks == null ? null : String(body.remarks),
      termsAcceptedAt: String(body.termsAcceptedAt ?? new Date().toISOString()),
      items: Array.isArray(body.items)
        ? body.items.map((item) => {
            const row = item as Record<string, unknown>;
            return {
              assetType: String(row.assetType ?? ''),
              quantity: Number(row.quantity ?? 0),
            };
          })
        : [],
    });
    return apiOk(result, 201);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function handlePendingRequests(request: Request): Promise<Response> {
  try {
    const auth = requireStaff(request);
    if (auth instanceof Response) return auth;
    const { listPendingRequests } = await import('@/server/request-repo.server');
    return apiOk(await listPendingRequests());
  } catch (error) {
    return handleApiError(error);
  }
}

export async function handleRequestPool(request: Request): Promise<Response> {
  try {
    const auth = requireStaff(request);
    if (auth instanceof Response) return auth;
    const view = new URL(request.url).searchParams.get('view') ?? 'all';
    const { listRequestPoolAssets, listAvailablePoolAssets, listAssignedRequestPoolAssets } =
      await import('@/server/request-repo.server');
    if (view === 'available') return apiOk(await listAvailablePoolAssets());
    if (view === 'assigned') return apiOk(await listAssignedRequestPoolAssets());
    return apiOk(await listRequestPoolAssets());
  } catch (error) {
    return handleApiError(error);
  }
}

export async function handleRequestLog(request: Request): Promise<Response> {
  try {
    const auth = requireStaff(request);
    if (auth instanceof Response) return auth;
    const { listRequestLog } = await import('@/server/request-repo.server');
    return apiOk(await listRequestLog());
  } catch (error) {
    return handleApiError(error);
  }
}

export async function handleRequestAction(request: Request, action: string): Promise<Response> {
  try {
    const auth = requireStaff(request);
    if (auth instanceof Response) return auth;
    const body = await readJsonBody<Record<string, unknown>>(request);
    if (body instanceof Response) return body;
    const actor = auth.staffId;

    if (action === 'pool-mark') {
      const { markAssetsForRequest } = await import('@/server/request-repo.server');
      const assets = Array.isArray(body.assets) ? body.assets : [];
      return apiOk(await markAssetsForRequest(assets as never));
    }
    if (action === 'pool-remove') {
      const { removeAssetFromRequestPool } = await import('@/server/request-repo.server');
      await removeAssetFromRequestPool(body as never);
      return apiOk({ ok: true });
    }
    if (action === 'book') {
      const { bookPoolAssetToRequest } = await import('@/server/request-repo.server');
      return apiOk(await bookPoolAssetToRequest({ ...body, bookedBy: actor } as never));
    }
    if (action === 'checkout-staff') {
      const { checkoutRequestAssignment } = await import('@/server/request-repo.server');
      await checkoutRequestAssignment({ ...body, checkedOutBy: actor } as never);
      return apiOk({ ok: true });
    }
    if (action === 'return-staff') {
      const { returnRequestAssignment } = await import('@/server/request-repo.server');
      await returnRequestAssignment({ ...body, returnedBy: actor } as never);
      return apiOk({ ok: true });
    }
    if (action === 'reject') {
      const { rejectUserRequest } = await import('@/server/request-repo.server');
      await rejectUserRequest({ ...body, rejectedBy: actor } as never);
      return apiOk({ ok: true });
    }
    if (action === 'slot-unavailable') {
      const { markRequestSlotUnavailable } = await import('@/server/request-repo.server');
      return apiOk(await markRequestSlotUnavailable({ ...body, markedBy: actor } as never));
    }
    if (action === 'slot-not-taken') {
      const { markRequestSlotNotTaken } = await import('@/server/request-repo.server');
      return apiOk(await markRequestSlotNotTaken({ ...body, markedBy: actor } as never));
    }
    if (action === 'cancel-not-taken') {
      const { cancelBookedAssignmentNotTaken } = await import('@/server/request-repo.server');
      await cancelBookedAssignmentNotTaken({ ...body, cancelledBy: actor } as never);
      return apiOk({ ok: true });
    }
    return apiError('Unknown request action.', 404, 'not_found');
  } catch (error) {
    return handleApiError(error);
  }
}

export async function handleUserRequestAction(request: Request, action: string): Promise<Response> {
  try {
    const auth = requireUser(request);
    if (auth instanceof Response) return auth;
    const body = await readJsonBody<Record<string, unknown>>(request);
    if (body instanceof Response) return body;
    const actor = auth.staffId;

    if (action === 'checkout') {
      const { checkoutUserRequest } = await import('@/server/request-repo.server');
      return apiOk(
        await checkoutUserRequest({
          requestId: Number(body.requestId),
          checkedOutBy: actor,
        }),
      );
    }
    if (action === 'return') {
      const { returnUserRequest } = await import('@/server/request-repo.server');
      return apiOk(
        await returnUserRequest({
          requestId: Number(body.requestId),
          returnedBy: actor,
        }),
      );
    }
    return apiError('Unknown request action.', 404, 'not_found');
  } catch (error) {
    return handleApiError(error);
  }
}

export async function handleAdminDashboard(request: Request): Promise<Response> {
  try {
    const auth = requireAdmin(request);
    if (auth instanceof Response) return auth;
    const periodDays = Number(new URL(request.url).searchParams.get('periodDays') ?? 30);
    const { getAdminDashboard } = await import('@/server/admin-dashboard-repo.server');
    const allowed = [7, 30, 90];
    const period = allowed.includes(periodDays) ? (periodDays as 7 | 30 | 90) : 30;
    return apiOk(await getAdminDashboard(period));
  } catch (error) {
    return handleApiError(error);
  }
}
