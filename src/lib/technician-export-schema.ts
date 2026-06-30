import type { AssetKind } from '@/lib/inventory-schema';

export type TechnicianAssetExportKind = AssetKind;

export type TechnicianReportRequestFilter = 'all' | 'request-only' | 'non-request';

export type TechnicianReportPdfFilters = {
  kinds: AssetKind[];
  statusIds: number[];
  requestFilter: TechnicianReportRequestFilter;
};
