import { createServerFn } from '@tanstack/react-start';
import type { AssetId, AssetKind } from '@shared/lib/inventory-schema';
import { staffMiddleware } from '@backend/server/core/auth-middleware';

export const getWarrantyContextFn = createServerFn({ method: 'POST' })
  .middleware([staffMiddleware])
  .inputValidator((input: { kind: AssetKind; assetId: AssetId }) => input)
  .handler(async ({ data: input }) => {
    const { getWarrantyContext } = await import('@backend/server/requests/warranty-repair-repo.server');
    return getWarrantyContext(input.kind, input.assetId);
  });
