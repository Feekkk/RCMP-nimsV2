import type { AssetId, AssetKind } from '@shared/lib/inventory-schema';

export type PmLogStatus = 'passed' | 'partial' | 'failed';
export type PmAssetCondition = 'good' | 'faulty';

export const PM_CONDITION_LABEL: Record<PmAssetCondition, string> = {
  good: 'Good condition',
  faulty: 'Needs action',
};

export type PmPlaceAsset = {
  kind: AssetKind;
  assetId: AssetId;
  category: string | null;
  brand: string | null;
  model: string | null;
  serialNum: string | null;
  building: string;
  level: string;
  zone: string;
  pendingFollowUp: boolean;
  lastFaultDate: string | null;
  lastFaultRemarks: string | null;
};

export type PmLocationTree = {
  buildings: string[];
  levelsByBuilding: Record<string, string[]>;
  zonesByBuildingLevel: Record<string, string[]>;
};

export type CreatePmLogAssetInput = {
  assetType: AssetKind;
  assetId: AssetId;
  condition: PmAssetCondition;
  remarks?: string | null;
};

export type CreatePmLogInput = {
  building: string;
  level: string;
  zone: string;
  performedBy: string;
  pmDate: string;
  remarks?: string | null;
  assets: CreatePmLogAssetInput[];
};

export type CreatePmLogResult = {
  pmLogId: number;
  status: PmLogStatus;
  assetsTotal: number;
  faultyCount: number;
  clearedCount: number;
};

export type UpdatePmLogAssetInput = {
  pmLogAssetId: number;
  condition: PmAssetCondition;
  remarks?: string | null;
};

export type UpdatePmLogAssetsInput = {
  pmLogId: number;
  assets: UpdatePmLogAssetInput[];
};

export type PmLogAsset = {
  pmLogAssetId: number;
  assetType: AssetKind;
  assetId: AssetId;
  assetCategory: string | null;
  assetLabel: string;
  serialNum: string | null;
  condition: PmAssetCondition;
  remarks: string | null;
  followUpRequired: boolean;
  resolvedAt: string | null;
};

export type PmLogListRow = {
  pmLogId: number;
  pmDate: string;
  building: string;
  level: string;
  zone: string;
  status: PmLogStatus;
  remarks: string | null;
  performedBy: string;
  performedByEmail: string | null;
  assetsTotal: number;
  goodCount: number;
  faultyCount: number;
  assets: PmLogAsset[];
};

export type PmLogListFilters = {
  search?: string;
  building?: string | 'all';
  status?: PmLogStatus | 'all';
  dateFrom?: string;
  dateTo?: string;
};

export type PmFollowUp = {
  pmLogAssetId: number;
  pmLogId: number;
  pmDate: string;
  assetType: AssetKind;
  assetId: AssetId;
  assetCategory: string | null;
  assetLabel: string;
  serialNum: string | null;
  building: string;
  level: string;
  zone: string;
  remarks: string | null;
  reportedBy: string;
};

export type PmStats = {
  visitsThisMonth: number;
  assetsChecked: number;
  faultyThisMonth: number;
  pendingFollowUp: number;
};

export function derivePmLogStatus(conditions: PmAssetCondition[]): PmLogStatus {
  if (conditions.length === 0) return 'passed';
  const faulty = conditions.filter((c) => c === 'faulty').length;
  if (faulty === 0) return 'passed';
  return faulty === conditions.length ? 'failed' : 'partial';
}

export function pmAssetKey(assetType: AssetKind, assetId: AssetId): string {
  return `${assetType}:${assetId}`;
}

export function pmZoneLookupKey(building: string, level: string): string {
  return `${building}||${level}`;
}
