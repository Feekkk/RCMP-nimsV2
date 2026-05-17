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

/** status table seed rows from schema.sql */
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
};

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
};

export type CreateLaptopInput = {
  assetId: number;
  serialNum?: string | null;
  brand?: string | null;
  model: string;
  category?: string | null;
  partNumber?: string | null;
  processor?: string | null;
  memory?: string | null;
  os?: string | null;
  storage?: string | null;
  gpu?: string | null;
  statusId: number;
  remarks?: string | null;
};

export type CreateAvInput = {
  assetId: number;
  assetIdOld?: string | null;
  category?: string | null;
  brand?: string | null;
  model: string;
  serialNum?: string | null;
  statusId: number;
  remarks?: string | null;
};

export type CreateNetworkInput = {
  assetId: number;
  serialNum?: string | null;
  brand?: string | null;
  model: string;
  macAddress?: string | null;
  ipAddress?: string | null;
  statusId: number;
  remarks?: string | null;
};

export type AssetRecord = LaptopAsset | AvAsset | NetworkAsset;

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
    'status_id',
    'remarks',
  ],
  av: ['asset_id', 'category', 'brand', 'model', 'serial_num', 'asset_id_old', 'status_id', 'remarks'],
  network: ['asset_id', 'serial_num', 'brand', 'model', 'mac_address', 'ip_address', 'status_id', 'remarks'],
};

export function isActiveStatus(statusId: number): boolean {
  return statusId === 1;
}
