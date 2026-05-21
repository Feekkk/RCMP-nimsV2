import { createFileRoute } from '@tanstack/react-router';
import { TechnicianWarrantyFormPage } from '@/technician/warranty-form';
import type { AssetKind } from '@/lib/inventory-schema';

type WarrantySearch = { kind?: AssetKind; assetId?: number };

export const Route = createFileRoute('/technician/warranty')({
  validateSearch: (search: Record<string, unknown>): WarrantySearch => {
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
      { title: 'Warranty claim | NIMS' },
      { name: 'description', content: 'Log a vendor warranty claim for a faulty asset.' },
    ],
  }),
  component: TechnicianWarrantyFormPage,
});
