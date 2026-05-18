import { createFileRoute } from '@tanstack/react-router';
import { TechnicianReturnPage } from '@/technician/returnPage';
import type { AssetKind } from '@/lib/inventory-schema';

type ReturnSearch = { kind?: AssetKind; assetId?: number };

export const Route = createFileRoute('/technician/return')({
  validateSearch: (search: Record<string, unknown>): ReturnSearch => {
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
      { title: 'Return asset | NIMS' },
      { name: 'description', content: 'Return a deployed inventory asset.' },
    ],
  }),
  component: TechnicianReturnPage,
});
