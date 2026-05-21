import { createServerFn } from '@tanstack/react-start';
import type { AssetKind } from '@/lib/inventory-schema';
import type { RepairInput, WarrantyClaimInput } from '@/lib/warranty-repair-schema';

export const getWarrantyContextFn = createServerFn({ method: 'POST' })
  .inputValidator((input: { kind: AssetKind; assetId: number }) => input)
  .handler(async ({ data: input }) => {
    const { getWarrantyContext } = await import('@/server/warranty-repair-repo.server');
    return getWarrantyContext(input.kind, input.assetId);
  });

export const createWarrantyClaimFn = createServerFn({ method: 'POST' })
  .inputValidator((input: WarrantyClaimInput) => input)
  .handler(async ({ data: input }) => {
    const { createWarrantyClaim } = await import('@/server/warranty-repair-repo.server');
    return createWarrantyClaim(input);
  });

export const createRepairFn = createServerFn({ method: 'POST' })
  .inputValidator((input: RepairInput) => input)
  .handler(async ({ data: input }) => {
    const { createRepair } = await import('@/server/warranty-repair-repo.server');
    return createRepair(input);
  });
