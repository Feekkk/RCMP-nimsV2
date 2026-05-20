/** Types and constants aligned with database/schema.sql */

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
  av: ['asset_id_old', 'status_id'],
};

export const INVENTORY_STATUSES = [
  { statusId: 1, name: 'active' },
  { statusId: 2, name: 'non-active' },
  { statusId: 3, name: 'deploy' },
  { statusId: 4, name: 'faulty' },
  { statusId: 5, name: 'disposed' },
  { statusId: 6, name: 'lost' },
  { statusId: 7, name: 'online' },
  { statusId: 8, name: 'offline' },
  { statusId: 9, name: 'active (request)' },
  { statusId: 10, name: 'booked (request)' },
  { statusId: 11, name: 'checkout (request)' },
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
} & PurchaseFields;

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
} & PurchaseFields;

export type NetworkAsset = {
  kind: 'network';
  assetId: number;
  serialNum: string | null;
  brand: string | null;
  model: string | null;
  macAddress: string | null;
  ipAddress: string | null;
  statusId: number;
  remarks: string | null;
} & PurchaseFields;

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
} & PurchaseFields;

export type CreateAvInput = {
  assetId: number;
  assetIdOld: string;
  category?: string | null;
  brand?: string | null;
  model?: string | null;
  serialNum?: string | null;
  statusId: number;
  remarks?: string | null;
} & PurchaseFields;

export type CreateNetworkInput = {
  assetId: number;
  serialNum?: string | null;
  brand?: string | null;
  model?: string | null;
  macAddress?: string | null;
  ipAddress?: string | null;
  statusId: number;
  remarks?: string | null;
} & PurchaseFields;

export type AssetRecord = LaptopAsset | AvAsset | NetworkAsset;

export type AssetTrailEvent = {
  at: string;
  sortKey: number;
  category: string;
  title: string;
  detail: string | null;
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
  ],
  network: [
    'asset_id',
    'serial_num',
    'brand',
    'model',
    'mac_address',
    'ip_address',
    ...PURCHASE_FIELD_COLUMNS,
    'status_id',
    'remarks',
  ],
};

/** In stock — available in inventory / request pool (not deployed, lost, or disposed). */
export const INSTOCK_STATUS_IDS = [1, 2, 4, 7, 8, 9, 10] as const;

/** Out of stock — deployed, disposed, lost, or checked out to a user. */
export const OUTSTOCK_STATUS_IDS = [3, 5, 6, 11] as const;

const INSTOCK_SET = new Set<number>(INSTOCK_STATUS_IDS);
const OUTSTOCK_SET = new Set<number>(OUTSTOCK_STATUS_IDS);

export function isInstockStatus(statusId: number): boolean {
  return INSTOCK_SET.has(statusId);
}

export function isOutstockStatus(statusId: number): boolean {
  return OUTSTOCK_SET.has(statusId);
}

/** @deprecated Use isInstockStatus — kept for callers that meant status_id 1 only */
export function isActiveStatus(statusId: number): boolean {
  return statusId === 1;
}

export function assetViewPath(kind: AssetKind, assetId: number): string {
  return `/technician/asset/${kind}/${assetId}`;
}

export function isBulkImportRequiredColumn(kind: AssetKind, column: string): boolean {
  return BULK_IMPORT_REQUIRED[kind].includes(column);
}
