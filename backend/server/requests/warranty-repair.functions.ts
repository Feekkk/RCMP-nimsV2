import { createServerFn } from '@tanstack/react-start';
import type { AssetKind } from '@shared/lib/inventory-schema';
import type { RepairInput, WarrantyClaimInput } from '@shared/lib/warranty-repair-schema';
import { staffMiddleware } from '@backend/server/core/auth-middleware';

export const getWarrantyContextFn = createServerFn({ method: 'POST' })
  .middleware([staffMiddleware])
  .inputValidator((input: { kind: AssetKind; assetId: number }) => input)
  .handler(async ({ data: input }) => {
    const { getWarrantyContext } = await import('@backend/server/requests/warranty-repair-repo.server');
    return getWarrantyContext(input.kind, input.assetId);
  });

export const createWarrantyClaimFn = createServerFn({ method: 'POST' })
  .middleware([staffMiddleware])
  .inputValidator((input: WarrantyClaimInput) => input)
  .handler(async ({ data: input }) => {
    const { createWarrantyClaim } = await import('@backend/server/requests/warranty-repair-repo.server');
    return createWarrantyClaim(input);
  });

export const createRepairFn = createServerFn({ method: 'POST' })
  .middleware([staffMiddleware])
  .inputValidator((input: RepairInput) => input)
  .handler(async ({ data: input }) => {
    const { createRepair } = await import('@backend/server/requests/warranty-repair-repo.server');
    return createRepair(input);
  });
