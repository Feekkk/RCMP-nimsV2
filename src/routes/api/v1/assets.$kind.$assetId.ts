import { createFileRoute } from '@tanstack/react-router';
import type { AssetKind } from '@/lib/inventory-schema';
import { handleAssetDetail } from '@/server/api-handlers.server';

function parseKind(raw: string): AssetKind | null {
  if (raw === 'laptop' || raw === 'av' || raw === 'network') return raw;
  return null;
}

export const Route = createFileRoute('/api/v1/assets/$kind/$assetId')({
  params: {
    parse: (params) => {
      const kind = parseKind(params.kind);
      const assetId = Number(params.assetId);
      if (!kind || Number.isNaN(assetId) || assetId <= 0) {
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
