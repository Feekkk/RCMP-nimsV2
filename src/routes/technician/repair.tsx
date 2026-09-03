import { createFileRoute } from '@tanstack/react-router';
import { TechnicianRepairFormPage } from '@/technician/repair-form';
import { parseAssetIdParam, parseAssetKindParam, type AssetId, type AssetKind } from '@shared/lib/inventory-schema';

type RepairSearch = { kind?: AssetKind; assetId?: AssetId };

export const Route = createFileRoute('/technician/repair')({
  validateSearch: (search: Record<string, unknown>): RepairSearch => {
    const kind = parseAssetKindParam(search.kind) ?? undefined;
    const assetId = parseAssetIdParam(search.assetId) ?? undefined;
    return { kind, assetId };
  },
  head: () => ({
    meta: [
      { title: 'In-house repair | NIMS' },
      { name: 'description', content: 'Log an in-house repair for an asset.' },
    ],
  }),
  component: TechnicianRepairFormPage,
});
