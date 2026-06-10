import { createServerFn } from '@tanstack/react-start';
import type {
  AssignAssetToRequestInput,
  ChangeBookedAssignmentInput,
  CheckoutRequestAssignmentInput,
  CheckoutUserRequestInput,
  CancelBookedNotTakenInput,
  MarkRequestSlotNotTakenInput,
  MarkRequestSlotUnavailableInput,
  ReturnRequestAssignmentInput,
  ReturnUserRequestInput,
  MarkAssetForRequestInput,
  MarkAssetsForRequestInput,
  RejectUserRequestInput,
  SubmitUserRequestInput,
} from '@/lib/request-schema';

export const listActiveForRequestPoolFn = createServerFn({ method: 'GET' }).handler(async () => {
  const { listActiveForRequestPool } = await import('@/server/request-repo.server');
  return listActiveForRequestPool();
});

export const listRequestPoolAssetsFn = createServerFn({ method: 'GET' }).handler(async () => {
  const { listRequestPoolAssets } = await import('@/server/request-repo.server');
  return listRequestPoolAssets();
});

export const listAvailablePoolAssetsFn = createServerFn({ method: 'GET' }).handler(async () => {
  const { listAvailablePoolAssets } = await import('@/server/request-repo.server');
  return listAvailablePoolAssets();
});

export const listAssignedRequestPoolAssetsFn = createServerFn({ method: 'GET' }).handler(async () => {
  const { listAssignedRequestPoolAssets } = await import('@/server/request-repo.server');
  return listAssignedRequestPoolAssets();
});

export const listPendingRequestsFn = createServerFn({ method: 'GET' }).handler(async () => {
  const { listPendingRequests } = await import('@/server/request-repo.server');
  return listPendingRequests();
});

export const listRequestLogFn = createServerFn({ method: 'GET' }).handler(async () => {
  const { listRequestLog } = await import('@/server/request-repo.server');
  return listRequestLog();
});

export const markAssetForRequestFn = createServerFn({ method: 'POST' })
  .inputValidator((input: MarkAssetForRequestInput) => input)
  .handler(async ({ data: input }) => {
    const { markAssetForRequest } = await import('@/server/request-repo.server');
    await markAssetForRequest(input);
  });

export const markAssetsForRequestFn = createServerFn({ method: 'POST' })
  .inputValidator((input: MarkAssetsForRequestInput) => input)
  .handler(async ({ data: input }) => {
    const { markAssetsForRequest } = await import('@/server/request-repo.server');
    return markAssetsForRequest(input.assets);
  });

export const listUserRequestHistoryFn = createServerFn({ method: 'POST' })
  .inputValidator((data: { staffId: string }) => data)
  .handler(async ({ data }) => {
    const { listUserRequestHistory } = await import('@/server/request-repo.server');
    return listUserRequestHistory(data.staffId);
  });

export const submitUserRequestFn = createServerFn({ method: 'POST' })
  .inputValidator((input: SubmitUserRequestInput) => input)
  .handler(async ({ data: input }) => {
    const { submitUserRequest } = await import('@/server/request-repo.server');
    return submitUserRequest(input);
  });

export const bookPoolAssetToRequestFn = createServerFn({ method: 'POST' })
  .inputValidator((input: AssignAssetToRequestInput) => input)
  .handler(async ({ data: input }) => {
    const { bookPoolAssetToRequest } = await import('@/server/request-repo.server');
    return bookPoolAssetToRequest(input);
  });

export const changeBookedAssignmentFn = createServerFn({ method: 'POST' })
  .inputValidator((input: ChangeBookedAssignmentInput) => input)
  .handler(async ({ data: input }) => {
    const { changeBookedAssignment } = await import('@/server/request-repo.server');
    await changeBookedAssignment(input);
  });

export const checkoutRequestAssignmentFn = createServerFn({ method: 'POST' })
  .inputValidator((input: CheckoutRequestAssignmentInput) => input)
  .handler(async ({ data: input }) => {
    const { checkoutRequestAssignment } = await import('@/server/request-repo.server');
    await checkoutRequestAssignment(input);
  });

export const checkoutUserRequestFn = createServerFn({ method: 'POST' })
  .inputValidator((input: CheckoutUserRequestInput) => input)
  .handler(async ({ data: input }) => {
    const { checkoutUserRequest } = await import('@/server/request-repo.server');
    return checkoutUserRequest(input);
  });

export const markRequestSlotUnavailableFn = createServerFn({ method: 'POST' })
  .inputValidator((input: MarkRequestSlotUnavailableInput) => input)
  .handler(async ({ data: input }) => {
    const { markRequestSlotUnavailable } = await import('@/server/request-repo.server');
    return markRequestSlotUnavailable(input);
  });

export const markRequestSlotNotTakenFn = createServerFn({ method: 'POST' })
  .inputValidator((input: MarkRequestSlotNotTakenInput) => input)
  .handler(async ({ data: input }) => {
    const { markRequestSlotNotTaken } = await import('@/server/request-repo.server');
    return markRequestSlotNotTaken(input);
  });

export const cancelBookedAssignmentNotTakenFn = createServerFn({ method: 'POST' })
  .inputValidator((input: CancelBookedNotTakenInput) => input)
  .handler(async ({ data: input }) => {
    const { cancelBookedAssignmentNotTaken } = await import('@/server/request-repo.server');
    await cancelBookedAssignmentNotTaken(input);
  });

export const returnRequestAssignmentFn = createServerFn({ method: 'POST' })
  .inputValidator((input: ReturnRequestAssignmentInput) => input)
  .handler(async ({ data: input }) => {
    const { returnRequestAssignment } = await import('@/server/request-repo.server');
    await returnRequestAssignment(input);
  });

export const returnUserRequestFn = createServerFn({ method: 'POST' })
  .inputValidator((input: ReturnUserRequestInput) => input)
  .handler(async ({ data: input }) => {
    const { returnUserRequest } = await import('@/server/request-repo.server');
    return returnUserRequest(input);
  });

export const rejectUserRequestFn = createServerFn({ method: 'POST' })
  .inputValidator((input: RejectUserRequestInput) => input)
  .handler(async ({ data: input }) => {
    const { rejectUserRequest } = await import('@/server/request-repo.server');
    await rejectUserRequest(input);
  });

/** @deprecated Use bookPoolAssetToRequestFn */
export const assignPoolAssetToRequestFn = bookPoolAssetToRequestFn;

/** @deprecated Use bookPoolAssetToRequestFn */
export const assignAssetToRequestFn = bookPoolAssetToRequestFn;

/** @deprecated Use listActiveForRequestPoolFn */
export const listAssignableAssetsFn = listActiveForRequestPoolFn;

/** @deprecated Use listRequestPoolAssetsFn */
export const listRequestAssignedAssetsFn = listRequestPoolAssetsFn;
