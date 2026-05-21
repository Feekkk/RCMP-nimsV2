import { createFileRoute } from '@tanstack/react-router';
import { TechnicianRepairFormPage } from '@/technician/repair-form';
import type { AssetKind } from '@/lib/inventory-schema';

type RepairSearch = { kind?: AssetKind; assetId?: number };

export const Route = createFileRoute('/technician/repair')({
  validateSearch: (search: Record<string, unknown>): RepairSearch => {
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
      { title: 'In-house repair | NIMS' },
      { name: 'description', content: 'Log an in-house repair for a faulty asset.' },
    ],
  }),
  component: TechnicianRepairFormPage,
});
