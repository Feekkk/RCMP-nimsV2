import type { AssetKind } from '@/lib/inventory-schema';

export type TechnicianAssetExportKind = AssetKind;

export type TechnicianReportRequestFilter = 'all' | 'request-only' | 'non-request';

export const REPORT_PDF_COLUMNS = [
  { key: 'type', label: 'Type', description: 'Asset category', weight: 1.0 },
  { key: 'id', label: 'ID', description: 'Asset identifier', weight: 0.75 },
  { key: 'model', label: 'Model', description: 'Device model', weight: 1.35 },
  { key: 'brand', label: 'Brand', description: 'Device brand', weight: 0.95 },
  { key: 'category', label: 'Category', description: 'Laptop / AV category', weight: 1.0 },
  { key: 'serial', label: 'Serial', description: 'Serial number', weight: 1.1 },
  { key: 'status', label: 'Status', description: 'Current asset status', weight: 1.0 },
  {
    key: 'handledBy',
    label: 'Handled by',
    description: 'Deploy: IT staff who handed over',
    weight: 1.25,
  },
  {
    key: 'handoverTo',
    label: 'Handover to',
    description: 'Deploy: staff recipient or place',
    weight: 1.35,
  },
  {
    key: 'location',
    label: 'Location',
    description: 'Deploy: building / level / zone',
    weight: 1.15,
  },
  {
    key: 'history',
    label: 'History',
    description: 'Active / non-active: full asset lifecycle',
    weight: 2.5,
  },
  {
    key: 'request',
    label: 'Request',
    description: 'Optional borrow-request reference',
    weight: 1.15,
  },
] as const;

export type ReportPdfColumn = (typeof REPORT_PDF_COLUMNS)[number]['key'];

export const DEFAULT_REPORT_PDF_COLUMNS: ReportPdfColumn[] = [
  'type',
  'id',
  'model',
  'brand',
  'serial',
  'status',
  'handledBy',
  'handoverTo',
];

export type TechnicianReportPdfFilters = {
  kinds: AssetKind[];
  statusIds: number[];
  requestFilter: TechnicianReportRequestFilter;
  columns: ReportPdfColumn[];
};
