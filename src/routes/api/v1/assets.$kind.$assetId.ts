import { createFileRoute } from '@tanstack/react-router';
import { parseAssetIdParam, parseAssetKindParam } from '@shared/lib/inventory-schema';
import { handleAssetDetail } from '@backend/server/api/api-handlers.server';

export const Route = createFileRoute('/api/v1/assets/$kind/$assetId')({
  params: {
    parse: (params) => {
      const kind = parseAssetKindParam(params.kind);
      const assetId = parseAssetIdParam(params.assetId);
      if (!kind || !assetId) {
        throw new Error('Invalid asset path.');
      }
      return { kind, assetId };
    },
    stringify: ({ kind, assetId }) => ({ kind, assetId: String(assetId) }),
  },
  server: {
    handlers: {
      GET: ({ request, params }) => handleAssetDetail(request, params.kind, params.assetId),
    },
  },
});
