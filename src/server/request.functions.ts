import { createServerFn } from '@tanstack/react-start';
import type {
  AssignAssetToRequestInput,
  MarkAssetForRequestInput,
  MarkAssetsForRequestInput,
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

export const assignPoolAssetToRequestFn = createServerFn({ method: 'POST' })
  .inputValidator((input: AssignAssetToRequestInput) => input)
  .handler(async ({ data: input }) => {
    const { assignPoolAssetToRequest } = await import('@/server/request-repo.server');
    await assignPoolAssetToRequest(input);
  });

/** @deprecated Use assignPoolAssetToRequestFn — asset must already be status 9 */
export const assignAssetToRequestFn = assignPoolAssetToRequestFn;

/** @deprecated Use listActiveForRequestPoolFn */
export const listAssignableAssetsFn = listActiveForRequestPoolFn;

/** @deprecated Use listRequestPoolAssetsFn */
export const listRequestAssignedAssetsFn = listRequestPoolAssetsFn;
