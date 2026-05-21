import type { AssetKind } from '@/lib/inventory-schema';
import type { WarrantyInput } from '@/lib/warranty-field-utils';

export type { WarrantyInput };
export { WARRANTY_FIELD_COLUMNS } from '@/lib/warranty-field-utils';

export type WarrantyRecord = {
  warrantyId: number;
  assetId: number;
  assetType: AssetKind;
  startDate: string;
  endDate: string;
  remarks: string | null;
};

export type WarrantyClaimInput = {
  kind: AssetKind;
  assetId: number;
  claimDate: string;
  claimTime?: string | null;
  issueSummary: string;
  claimRemarks?: string | null;
  claimedBy: string;
};

export type RepairInput = {
  kind: AssetKind;
  assetId: number;
  repairDate: string;
  issueSummary: string;
  repairRemarks?: string | null;
  staffId: string;
  /** When set, marks repair done and restores asset to active / online. */
  completedDate?: string | null;
};

export type FaultyRepairSearch = {
  kind: AssetKind;
  assetId: number;
};

/** Parsed from /technician/faulty | /warranty | /repair search params. */
export function parseFaultyAssetRouteSearch(
  search: Record<string, unknown>,
): FaultyRepairSearch | null {
  const kind = search.kind;
  const assetId = Number(search.assetId);
  if ((kind !== 'laptop' && kind !== 'av' && kind !== 'network') || Number.isNaN(assetId) || assetId <= 0) {
    return null;
  }
  return { kind, assetId };
}

export type WarrantyContext = {
  warranty: WarrantyRecord | null;
  isActive: boolean;
  recentClaims: {
    claimId: number;
    claimDate: string;
    issueSummary: string;
    claimRemarks: string | null;
  }[];
};
