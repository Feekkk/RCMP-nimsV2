/** Types and constants aligned with database/schema.sql */

import type { WarrantyInput } from '@/lib/warranty-field-utils';

export type { WarrantyInput };
export { WARRANTY_FIELD_COLUMNS } from '@/lib/warranty-field-utils';

export type AssetKind = 'laptop' | 'av' | 'network';

export const ASSET_KIND_LABEL: Record<AssetKind, string> = {
  laptop: 'Laptop / Desktop',
  av: 'AV equipment',
  network: 'Network equipment',
};

export const ASSET_LIST_PATH: Record<AssetKind, string> = {
  laptop: '/technician/laptop',
  av: '/technician/av',
  network: '/technician/network',
};

/** Columns shared by laptop, network, av (schema PO_* / purchase) */
export const PURCHASE_FIELD_COLUMNS = [
  'po_date',
  'po_num',
  'do_date',
  'do_num',
  'invoice_date',
  'invoice_num',
  'purchase_cost',
] as const;

export type PurchaseFields = {
  poDate?: string | null;
  poNum?: string | null;
  doDate?: string | null;
  doNum?: string | null;
  invoiceDate?: string | null;
  invoiceNum?: string | null;
  purchaseCost?: number | null;
};

/** CSV / form fields marked required in schema COMMENT */
/** asset_id omitted — auto-generated when CSV cell is blank (see assetid-flow.md). */
export const BULK_IMPORT_REQUIRED: Record<AssetKind, readonly string[]> = {
  laptop: ['serial_num', 'category', 'status_id'],
  network: ['status_id'],
  av: ['status_id'],
};

export const INVENTORY_STATUSES = [
  { statusId: 1, name: 'new' },
  { statusId: 2, name: 'return' },
  { statusId: 3, name: 'deploy' },
  { statusId: 4, name: 'assign' },
  { statusId: 5, name: 'disposed' },
  { statusId: 6, name: 'active (request)' },
  { statusId: 7, name: 'booked (request)' },
  { statusId: 8, name: 'checkout (request)' },
] as const;

export type StatusId = (typeof INVENTORY_STATUSES)[number]['statusId'];

export function getStatusName(statusId: number): string {
  return INVENTORY_STATUSES.find((s) => s.statusId === statusId)?.name ?? `status ${statusId}`;
}

export function formatStatusLabel(statusId: number): string {
  return getStatusName(statusId).replace(/_/g, ' ');
}

export type LaptopAsset = {
  kind: 'laptop';
  assetId: number;
  serialNum: string | null;
  brand: string | null;
  model: string | null;
  category: string | null;
  partNumber: string | null;
  processor: string | null;
  memory: string | null;
  os: string | null;
  storage: string | null;
  gpu: string | null;
  statusId: number;
  remarks: string | null;
  recipientDivision: string | null;
} & PurchaseFields;

export type PlaceFields = {
  building: string | null;
  level: string | null;
  zone: string | null;
};

export type AvAsset = {
  kind: 'av';
  assetId: number;
  assetIdOld: string | null;
  category: string | null;
  brand: string | null;
  model: string | null;
  serialNum: string | null;
  statusId: number;
  remarks: string | null;
} & PlaceFields &
  PurchaseFields;

export type NetworkAsset = {
  kind: 'network';
  assetId: number;
  category: string | null;
  serialNum: string | null;
  brand: string | null;
  model: string | null;
  macAddress: string | null;
  ipAddress: string | null;
  statusId: number;
  remarks: string | null;
} & PlaceFields &
  PurchaseFields;

export type CreateLaptopInput = {
  assetId: number;
  serialNum: string;
  brand?: string | null;
  model?: string | null;
  category: string;
  partNumber?: string | null;
  processor?: string | null;
  memory?: string | null;
  os?: string | null;
  storage?: string | null;
  gpu?: string | null;
  statusId: number;
  remarks?: string | null;
  warranty?: WarrantyInput | null;
} & PurchaseFields;

export type CreateAvInput = {
  assetId: number;
  assetIdOld?: string | null;
  category?: string | null;
  brand?: string | null;
  model?: string | null;
  serialNum?: string | null;
  statusId: number;
  remarks?: string | null;
  warranty?: WarrantyInput | null;
} & PurchaseFields;

export type CreateNetworkInput = {
  assetId: number;
  category?: string | null;
  serialNum?: string | null;
  brand?: string | null;
  model?: string | null;
  macAddress?: string | null;
  ipAddress?: string | null;
  statusId: number;
  remarks?: string | null;
  warranty?: WarrantyInput | null;
} & PurchaseFields;

export type AssetRecord = LaptopAsset | AvAsset | NetworkAsset;

export type AssetTrailEvent = {
  at: string;
  sortKey: number;
  category: string;
  title: string;
  detail: string | null;
  requestId?: number | null;
  disposalId?: number | null;
};

export type AssetDetailMeta = {
  statusName: string;
  createdAt: string | null;
  updatedAt: string | null;
};

export type AssetDetail = AssetRecord & AssetDetailMeta;

export type AssetDetailResponse = {
  asset: AssetDetail;
  trails: AssetTrailEvent[];
};

/** status_id = deploy — handover / deployment columns become required on import */
export const BULK_IMPORT_STATUS_DEPLOY = 3;

/** Laptop handover (`handover` table) — required when status_id is 3 */
export const BULK_LAPTOP_HANDOVER_COLUMNS = [
  'handover_staff_id',
  'handover_date',
  'handover_remarks',
  'employee_no',
] as const;

/** AV / network deployment — required when status_id is 3 */
export const BULK_PLACE_DEPLOYMENT_COLUMNS = [
  'deployment_staff_id',
  'building',
  'level',
  'zone',
  'deployment_date',
  'deployment_remarks',
] as const;

export const BULK_LAPTOP_HANDOVER_REQUIRED = ['handover_staff_id', 'handover_date'] as const;

export const BULK_PLACE_DEPLOYMENT_REQUIRED = ['deployment_staff_id', 'building'] as const;

export type BulkLaptopHandoverImport = {
  /** User email from CSV column handover_staff_id */
  handoverStaffEmail: string;
  handoverDate: string;
  handoverRemarks: string | null;
  employeeNo: string | null;
};

export type BulkPlaceDeploymentImport = {
  /** User email from CSV column deployment_staff_id */
  deploymentStaffEmail: string;
  building: string;
  level: string;
  zone: string;
  deploymentDate: string;
  deploymentRemarks: string | null;
};

export const BULK_IMPORT_COLUMNS: Record<AssetKind, readonly string[]> = {
  laptop: [
    'asset_id',
    'serial_num',
    'brand',
    'model',
    'category',
    'part_number',
    'processor',
    'memory',
    'os',
    'storage',
    'gpu',
    ...PURCHASE_FIELD_COLUMNS,
    'status_id',
    'remarks',
    'warranty_start_date',
    'warranty_end_date',
    'warranty_remarks',
    ...BULK_LAPTOP_HANDOVER_COLUMNS,
  ],
  av: [
    'asset_id',
    'asset_id_old',
    'category',
    'brand',
    'model',
    'serial_num',
    ...PURCHASE_FIELD_COLUMNS,
    'status_id',
    'remarks',
    'warranty_start_date',
    'warranty_end_date',
    'warranty_remarks',
    ...BULK_PLACE_DEPLOYMENT_COLUMNS,
  ],
  network: [
    'asset_id',
    'category',
    'serial_num',
    'brand',
    'model',
    'mac_address',
    'ip_address',
    ...PURCHASE_FIELD_COLUMNS,
    'status_id',
    'remarks',
    'warranty_start_date',
    'warranty_end_date',
    'warranty_remarks',
    ...BULK_PLACE_DEPLOYMENT_COLUMNS,
  ],
};

export function bulkImportDeployColumns(kind: AssetKind): readonly string[] {
  return kind === 'laptop' ? BULK_LAPTOP_HANDOVER_COLUMNS : BULK_PLACE_DEPLOYMENT_COLUMNS;
}

export function bulkImportDeployRequiredColumns(kind: AssetKind): readonly string[] {
  return kind === 'laptop' ? BULK_LAPTOP_HANDOVER_REQUIRED : BULK_PLACE_DEPLOYMENT_REQUIRED;
}

/** In stock — on-site / available (new, return, assign, or reserved for a request). */
export const INSTOCK_STATUS_IDS = [1, 2, 4, 6, 7] as const;

/** Out of stock — deployed, disposed, or checked out to a user. */
export const OUTSTOCK_STATUS_IDS = [3, 5, 8] as const;

const INSTOCK_SET = new Set<number>(INSTOCK_STATUS_IDS);
const OUTSTOCK_SET = new Set<number>(OUTSTOCK_STATUS_IDS);

export function isInstockStatus(statusId: number): boolean {
  return INSTOCK_SET.has(statusId);
}

export function isOutstockStatus(statusId: number): boolean {
  return OUTSTOCK_SET.has(statusId);
}

export function assetViewPath(kind: AssetKind, assetId: number): string {
  return `/technician/asset/${kind}/${assetId}`;
}

export function isBulkImportRequiredColumn(kind: AssetKind, column: string): boolean {
  return BULK_IMPORT_REQUIRED[kind].includes(column);
}
