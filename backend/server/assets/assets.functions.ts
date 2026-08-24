import { createServerFn } from '@tanstack/react-start';
import type {
  AssetKind,
  CreateAvInput,
  CreateLaptopInput,
  CreateNetworkInput,
} from '@shared/lib/inventory-schema';
import type { MarkAssetsPredisposedInput, RemoveAssetsFromPredisposalInput } from '@shared/lib/disposal-schema';
import type { NextAssetIdRequest } from '@backend/server/assets/asset-id.server';
import type {
  BulkAvImportRow,
  BulkLaptopImportRow,
  BulkNetworkImportRow,
} from '@backend/server/assets/assets-repo.server';
import { staffMiddleware } from '@backend/server/core/auth-middleware';

export const listAssetsFn = createServerFn({ method: 'GET' })
  .middleware([staffMiddleware])
  .inputValidator((kind: AssetKind) => kind)
  .handler(async ({ data: kind }) => {
    const { listAssets } = await import('@backend/server/assets/assets-repo.server');
    return listAssets(kind);
  });

export const createLaptopFn = createServerFn({ method: 'POST' })
  .middleware([staffMiddleware])
  .inputValidator((input: CreateLaptopInput) => input)
  .handler(async ({ data: input }) => {
    const { createLaptop } = await import('@backend/server/assets/assets-repo.server');
    return createLaptop(input);
  });

export const createAvFn = createServerFn({ method: 'POST' })
  .middleware([staffMiddleware])
  .inputValidator((input: CreateAvInput) => input)
  .handler(async ({ data: input }) => {
    const { createAv } = await import('@backend/server/assets/assets-repo.server');
    return createAv(input);
  });

export const createNetworkFn = createServerFn({ method: 'POST' })
  .middleware([staffMiddleware])
  .inputValidator((input: CreateNetworkInput) => input)
  .handler(async ({ data: input }) => {
    const { createNetwork } = await import('@backend/server/assets/assets-repo.server');
    return createNetwork(input);
  });

export const bulkCreateLaptopsFn = createServerFn({ method: 'POST' })
  .middleware([staffMiddleware])
  .inputValidator((rows: CreateLaptopInput[]) => rows)
  .handler(async ({ data: rows }) => {
    const { bulkCreateLaptops } = await import('@backend/server/assets/assets-repo.server');
    return bulkCreateLaptops(rows);
  });

export const bulkCreateAvFn = createServerFn({ method: 'POST' })
  .middleware([staffMiddleware])
  .inputValidator((rows: CreateAvInput[]) => rows)
  .handler(async ({ data: rows }) => {
    const { bulkCreateAv } = await import('@backend/server/assets/assets-repo.server');
    return bulkCreateAv(rows);
  });

export const bulkCreateNetworkFn = createServerFn({ method: 'POST' })
  .middleware([staffMiddleware])
  .inputValidator((rows: CreateNetworkInput[]) => rows)
  .handler(async ({ data: rows }) => {
    const { bulkCreateNetwork } = await import('@backend/server/assets/assets-repo.server');
    return bulkCreateNetwork(rows);
  });

export const getNextAssetIdFn = createServerFn({ method: 'GET' })
  .middleware([staffMiddleware])
  .inputValidator((input: NextAssetIdRequest) => input)
  .handler(async ({ data: input }) => {
    const { getNextAssetIdFromDb } = await import('@backend/server/assets/asset-id.server');
    return getNextAssetIdFromDb(input);
  });

export const bulkCreateLaptopsImportFn = createServerFn({ method: 'POST' })
  .middleware([staffMiddleware])
  .inputValidator((rows: BulkLaptopImportRow[]) => rows)
  .handler(async ({ data: rows }) => {
    const { bulkCreateLaptopsWithGeneratedIds } = await import('@backend/server/assets/assets-repo.server');
    return bulkCreateLaptopsWithGeneratedIds(rows);
  });

export const bulkCreateAvImportFn = createServerFn({ method: 'POST' })
  .middleware([staffMiddleware])
  .inputValidator((rows: BulkAvImportRow[]) => rows)
  .handler(async ({ data: rows }) => {
    const { bulkCreateAvWithGeneratedIds } = await import('@backend/server/assets/assets-repo.server');
    return bulkCreateAvWithGeneratedIds(rows);
  });

export const bulkCreateNetworkImportFn = createServerFn({ method: 'POST' })
  .middleware([staffMiddleware])
  .inputValidator((rows: BulkNetworkImportRow[]) => rows)
  .handler(async ({ data: rows }) => {
    const { bulkCreateNetworkWithGeneratedIds } = await import('@backend/server/assets/assets-repo.server');
    return bulkCreateNetworkWithGeneratedIds(rows);
  });

export type UpdateAssetStatusInput = {
  kind: AssetKind;
  assetId: number;
  statusId: number;
};

export const updateAssetStatusFn = createServerFn({ method: 'POST' })
  .middleware([staffMiddleware])
  .inputValidator((input: UpdateAssetStatusInput) => input)
  .handler(async ({ data: input }) => {
    const { updateAssetStatus } = await import('@backend/server/assets/assets-repo.server');
    return updateAssetStatus(input.kind, input.assetId, input.statusId);
  });

export type GetAssetDetailInput = { kind: AssetKind; assetId: number };

export const getAssetDetailFn = createServerFn({ method: 'GET' })
  .middleware([staffMiddleware])
  .inputValidator((input: GetAssetDetailInput) => input)
  .handler(async ({ data: input }) => {
    const { getAssetDetail } = await import('@backend/server/assets/assets-repo.server');
    return getAssetDetail(input.kind, input.assetId);
  });

/**
 * Resolves an asset by scanned/typed code — tries the current asset ID first, then falls back to
 * AV's legacy `asset_id_old` label. Used by the barcode/manual asset lookup.
 */
export const findAssetByCodeFn = createServerFn({ method: 'GET' })
  .middleware([staffMiddleware])
  .inputValidator((code: string) => code)
  .handler(async ({ data: code }) => {
    const { findAssetByCode } = await import('@backend/server/assets/assets-repo.server');
    return findAssetByCode(code);
  });

export const listPredisposalEligibleAssetsFn = createServerFn({ method: 'GET' })
  .middleware([staffMiddleware])
  .handler(async () => {
    const { listPredisposalEligibleAssets } = await import('@backend/server/assets/assets-repo.server');
    return listPredisposalEligibleAssets();
  });

export const listPreDisposedAssetsFn = createServerFn({ method: 'GET' })
  .middleware([staffMiddleware])
  .handler(async () => {
    const { listPreDisposedAssets } = await import('@backend/server/assets/assets-repo.server');
    return listPreDisposedAssets();
  });

export const markAssetsPredisposedFn = createServerFn({ method: 'POST' })
  .middleware([staffMiddleware])
  .inputValidator((input: MarkAssetsPredisposedInput) => input)
  .handler(async ({ data: input, context }) => {
    const { markAssetsPredisposed } = await import('@backend/server/assets/assets-repo.server');
    return markAssetsPredisposed(input.assets, context.staffId);
  });

export const removeAssetsFromPredisposalFn = createServerFn({ method: 'POST' })
  .middleware([staffMiddleware])
  .inputValidator((input: RemoveAssetsFromPredisposalInput) => input)
  .handler(async ({ data: input, context }) => {
    const { removeAssetsFromPredisposal } = await import('@backend/server/assets/assets-repo.server');
    return removeAssetsFromPredisposal(input.assets, context.staffId);
  });
