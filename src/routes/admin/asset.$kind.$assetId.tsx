import { createFileRoute } from '@tanstack/react-router';
import { AdminAssetViewPage } from '@/admin/asset-view';
import type { AssetKind } from '@/lib/inventory-schema';

function parseKind(raw: string): AssetKind | null {
  if (raw === 'laptop' || raw === 'av' || raw === 'network') return raw;
  return null;
}

export const Route = createFileRoute('/admin/asset/$kind/$assetId')({
  params: {
    parse: (params) => {
      const kind = parseKind(params.kind);
      const assetId = Number(params.assetId);
      if (!kind || Number.isNaN(assetId) || assetId <= 0) {
        throw new Error('This asset link is not valid. Open the asset from the inventory list.');
      }
      return { kind, assetId };
    },
    stringify: ({ kind, assetId }) => ({ kind, assetId: String(assetId) }),
  },
  head: ({ params }) => ({
    meta: [
      { title: `Asset #${params.assetId} | NIMS Admin` },
      { name: 'description', content: 'Administrator view of asset details and activity trail.' },
    ],
  }),
  component: AssetViewRoute,
});

function AssetViewRoute() {
  const { kind, assetId } = Route.useParams();
  return <AdminAssetViewPage kind={kind} assetId={assetId} />;
}
