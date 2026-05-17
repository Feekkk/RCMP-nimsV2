import { createServerFn } from '@tanstack/react-start';
import type {
  AssetKind,
  CreateAvInput,
  CreateLaptopInput,
  CreateNetworkInput,
} from '@/lib/inventory-schema';

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
