import type { AssetKind } from '@/lib/inventory-schema';

export type PmLogStatus = 'passed' | 'failed' | 'partial';
export type PmItemResult = 'pass' | 'fail' | 'na';

export type PmChecklistSummary = {
  checklistId: number;
  assetType: AssetKind;
  assetCategory: string;
  checklistName: string;
  itemCount: number;
};

export type PmChecklistItem = {
  itemId: number;
  checklistId: number;
  itemDescription: string;
};

export type PmChecklistDetail = PmChecklistSummary & {
  items: PmChecklistItem[];
};

export type CreatePmChecklistInput = {
  assetType: AssetKind;
  assetCategory: string;
  checklistName: string;
  items?: string[];
};

export type UpdatePmChecklistInput = {
  checklistId: number;
  assetCategory: string;
  checklistName: string;
};

export type AddPmChecklistItemInput = {
  checklistId: number;
  itemDescription: string;
};

export type UpdatePmChecklistItemInput = {
  itemId: number;
  itemDescription: string;
};

export type PmPlaceAsset = {
  kind: AssetKind;
  assetId: number;
  category: string | null;
  brand: string | null;
  model: string | null;
  serialNum: string | null;
  building: string;
  level: string;
  zone: string;
  checklistId: number | null;
};

export type PmLocationTree = {
  buildings: string[];
  levelsByBuilding: Record<string, string[]>;
  zonesByBuildingLevel: Record<string, string[]>;
};

export type CreatePmLogItemInput = {
  itemId: number;
  result: PmItemResult;
  remarks?: string | null;
};

export type CreatePmLogInput = {
  assetId: number;
  assetType: AssetKind;
  checklistId: number;
  performedBy: string;
  pmDate: string;
  remarks?: string | null;
  items: CreatePmLogItemInput[];
};

export type CreatePmLogResult = {
  pmLogId: number;
  status: PmLogStatus;
};

export type PmLogListFilters = {
  search?: string;
  assetType?: AssetKind | 'all';
  assetCategory?: string | 'all';
  status?: PmLogStatus | 'all';
  dateFrom?: string;
  dateTo?: string;
};

export type PmLogListRow = {
  pmLogId: number;
  pmDate: string;
  assetId: number;
  assetType: AssetKind;
  assetCategory: string | null;
  assetLabel: string;
  serialNum: string | null;
  checklistId: number;
  checklistName: string;
  status: PmLogStatus;
  remarks: string | null;
  performedBy: string;
  performedByEmail: string | null;
  itemsChecked: number;
  itemsTotal: number;
  failCount: number;
};

export type PmStats = {
  thisMonth: number;
  passed: number;
  issues: number;
  assetsCovered: number;
};

export function derivePmLogStatus(results: PmItemResult[]): PmLogStatus {
  const actionable = results.filter((r) => r !== 'na');
  if (actionable.length === 0) return 'passed';
  const fails = actionable.filter((r) => r === 'fail').length;
  if (fails === 0) return 'passed';
  if (fails === actionable.length) return 'failed';
  return 'partial';
}
