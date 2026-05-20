import { createFileRoute } from '@tanstack/react-router';
import { TechnicianAssetViewPage } from '@/technician/asset-view';
import type { AssetKind } from '@/lib/inventory-schema';

function parseKind(raw: string): AssetKind | null {
  if (raw === 'laptop' || raw === 'av' || raw === 'network') return raw;
  return null;
}

export const Route = createFileRoute('/technician/asset/$kind/$assetId')({
  params: {
    parse: (params) => {
      const kind = parseKind(params.kind);
      const assetId = Number(params.assetId);
      if (!kind || Number.isNaN(assetId) || assetId <= 0) {
        throw new Error('Invalid asset link');
      }
      return { kind, assetId };
    },
    stringify: ({ kind, assetId }) => ({ kind, assetId: String(assetId) }),
  },
  head: ({ params }) => ({
    meta: [
      { title: `Asset #${params.assetId} | NIMS` },
      { name: 'description', content: 'Asset details and activity trail.' },
    ],
  }),
  component: AssetViewRoute,
});

function AssetViewRoute() {
  const { kind, assetId } = Route.useParams();
  return <TechnicianAssetViewPage kind={kind} assetId={assetId} />;
}
