import { createFileRoute } from '@tanstack/react-router';
import { TechnicianFaultyPage } from '@/technician/faulty-page';
import type { AssetKind } from '@/lib/inventory-schema';

type FaultySearch = { kind?: AssetKind; assetId?: number };

export const Route = createFileRoute('/technician/faulty')({
  validateSearch: (search: Record<string, unknown>): FaultySearch => {
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
      { title: 'Faulty asset | NIMS' },
      { name: 'description', content: 'Warranty claim or in-house repair for a faulty asset.' },
    ],
  }),
  component: TechnicianFaultyPage,
});
