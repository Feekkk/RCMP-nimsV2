import { createFileRoute } from '@tanstack/react-router';
import { TechnicianDeployPage } from '@/technician/deployPage';
import type { AssetKind } from '@/lib/inventory-schema';

type DeploySearch = { kind?: AssetKind; assetId?: number };

export const Route = createFileRoute('/technician/deploy')({
  validateSearch: (search: Record<string, unknown>): DeploySearch => {
    const kind = search.kind;
    const assetId = Number(search.assetId);
    const validKind = kind === 'laptop' || kind === 'av' || kind === 'network' ? kind : undefined;
    return {
      kind: validKind,
      assetId: !Number.isNaN(assetId) && assetId > 0 ? assetId : undefined,
    };
  },
  head: () => ({
    meta: [
      { title: 'Deploy asset | NIMS' },
      { name: 'description', content: 'Deploy or hand over an inventory asset.' },
    ],
  }),
  component: TechnicianDeployPage,
});
