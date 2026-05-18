import { createServerFn } from '@tanstack/react-start';
import type {
  AssetKind,
  CreateAvInput,
  CreateLaptopInput,
  CreateNetworkInput,
} from '@/lib/inventory-schema';
import type { NextAssetIdRequest } from '@/server/asset-id.server';
import type {
  BulkAvImportRow,
  BulkLaptopImportRow,
  BulkNetworkImportRow,
} from '@/server/assets-repo.server';

export const listAssetsFn = createServerFn({ method: 'GET' })
  .inputValidator((kind: AssetKind) => kind)
  .handler(async ({ data: kind }) => {
    const { listAssets } = await import('@/server/assets-repo.server');
    return listAssets(kind);
  });

export const createLaptopFn = createServerFn({ method: 'POST' })
  .inputValidator((input: CreateLaptopInput) => input)
  .handler(async ({ data: input }) => {
    const { createLaptop } = await import('@/server/assets-repo.server');
    return createLaptop(input);
  });

export const createAvFn = createServerFn({ method: 'POST' })
  .inputValidator((input: CreateAvInput) => input)
  .handler(async ({ data: input }) => {
    const { createAv } = await import('@/server/assets-repo.server');
    return createAv(input);
  });

export const createNetworkFn = createServerFn({ method: 'POST' })
  .inputValidator((input: CreateNetworkInput) => input)
  .handler(async ({ data: input }) => {
    const { createNetwork } = await import('@/server/assets-repo.server');
    return createNetwork(input);
  });

export const bulkCreateLaptopsFn = createServerFn({ method: 'POST' })
  .inputValidator((rows: CreateLaptopInput[]) => rows)
  .handler(async ({ data: rows }) => {
    const { bulkCreateLaptops } = await import('@/server/assets-repo.server');
    return bulkCreateLaptops(rows);
  });

export const bulkCreateAvFn = createServerFn({ method: 'POST' })
  .inputValidator((rows: CreateAvInput[]) => rows)
  .handler(async ({ data: rows }) => {
    const { bulkCreateAv } = await import('@/server/assets-repo.server');
    return bulkCreateAv(rows);
  });

export const bulkCreateNetworkFn = createServerFn({ method: 'POST' })
  .inputValidator((rows: CreateNetworkInput[]) => rows)
  .handler(async ({ data: rows }) => {
    const { bulkCreateNetwork } = await import('@/server/assets-repo.server');
    return bulkCreateNetwork(rows);
  });

export const getNextAssetIdFn = createServerFn({ method: 'GET' })
  .inputValidator((input: NextAssetIdRequest) => input)
  .handler(async ({ data: input }) => {
    const { getNextAssetIdFromDb } = await import('@/server/asset-id.server');
    return getNextAssetIdFromDb(input);
  });

export const bulkCreateLaptopsImportFn = createServerFn({ method: 'POST' })
  .inputValidator((rows: BulkLaptopImportRow[]) => rows)
  .handler(async ({ data: rows }) => {
    const { bulkCreateLaptopsWithGeneratedIds } = await import('@/server/assets-repo.server');
    return bulkCreateLaptopsWithGeneratedIds(rows);
  });

export const bulkCreateAvImportFn = createServerFn({ method: 'POST' })
  .inputValidator((rows: BulkAvImportRow[]) => rows)
  .handler(async ({ data: rows }) => {
    const { bulkCreateAvWithGeneratedIds } = await import('@/server/assets-repo.server');
    return bulkCreateAvWithGeneratedIds(rows);
  });

export const bulkCreateNetworkImportFn = createServerFn({ method: 'POST' })
  .inputValidator((rows: BulkNetworkImportRow[]) => rows)
  .handler(async ({ data: rows }) => {
    const { bulkCreateNetworkWithGeneratedIds } = await import('@/server/assets-repo.server');
    return bulkCreateNetworkWithGeneratedIds(rows);
  });

export type UpdateAssetStatusInput = {
  kind: AssetKind;
  assetId: number;
  statusId: number;
};

export const updateAssetStatusFn = createServerFn({ method: 'POST' })
  .inputValidator((input: UpdateAssetStatusInput) => input)
  .handler(async ({ data: input }) => {
    const { updateAssetStatus } = await import('@/server/assets-repo.server');
    return updateAssetStatus(input.kind, input.assetId, input.statusId);
  });
