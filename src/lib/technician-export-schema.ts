import type { AssetKind } from '@/lib/inventory-schema';

export type TechnicianAssetExportKind = AssetKind;

export type TechnicianReportRequestFilter = 'all' | 'request-only' | 'non-request';

export const REPORT_PDF_COLUMNS = [
  { key: 'type', label: 'Type', weight: 1.3 },
  { key: 'id', label: 'ID', weight: 0.85 },
  { key: 'model', label: 'Model', weight: 1.55 },
  { key: 'brand', label: 'Brand', weight: 1.05 },
  { key: 'category', label: 'Category', weight: 1.15 },
  { key: 'serial', label: 'Serial', weight: 1.25 },
  { key: 'status', label: 'Status', weight: 1.2 },
  { key: 'requestId', label: 'Request', weight: 0.85 },
  { key: 'requester', label: 'Requester', weight: 1.4 },
] as const;

export type ReportPdfColumn = (typeof REPORT_PDF_COLUMNS)[number]['key'];

export const DEFAULT_REPORT_PDF_COLUMNS: ReportPdfColumn[] = [
  'type',
  'id',
  'model',
  'brand',
  'serial',
  'status',
];

export type TechnicianReportPdfFilters = {
  kinds: AssetKind[];
  statusIds: number[];
  requestFilter: TechnicianReportRequestFilter;
  columns: ReportPdfColumn[];
};
