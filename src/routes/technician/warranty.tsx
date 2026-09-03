import { createFileRoute } from '@tanstack/react-router';
import { TechnicianWarrantyFormPage } from '@/technician/warranty-form';
import { parseAssetIdParam, parseAssetKindParam, type AssetId, type AssetKind } from '@shared/lib/inventory-schema';

type WarrantySearch = { kind?: AssetKind; assetId?: AssetId };

export const Route = createFileRoute('/technician/warranty')({
  validateSearch: (search: Record<string, unknown>): WarrantySearch => {
    const kind = parseAssetKindParam(search.kind) ?? undefined;
    const assetId = parseAssetIdParam(search.assetId) ?? undefined;
    return { kind, assetId };
  },
  head: () => ({
    meta: [
      { title: 'Warranty claim | NIMS' },
      { name: 'description', content: 'Log a vendor warranty claim for an asset.' },
    ],
  }),
  component: TechnicianWarrantyFormPage,
});
