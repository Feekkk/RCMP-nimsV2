import type { AssetKind } from '@/lib/inventory-schema';
import { STATUS_ID } from '@/lib/asset-status-actions';

/** Assets eligible for disposal: non-active (2) or offline (8). */
export const DISPOSAL_ELIGIBLE_STATUS_IDS = [
  STATUS_ID.NON_ACTIVE,
  STATUS_ID.OFFLINE,
] as const;

export type DisposalAssetType = 'laptop' | 'av' | 'network';

export function disposalAssetType(kind: AssetKind): DisposalAssetType {
  return kind;
}

export type DisposalAssetPick = {
  kind: AssetKind;
  assetId: number;
  itemRemarks?: string | null;
};

export type CreateDisposalInput = {
  requestedBy: string;
  disposalDate: string;
  disposalTime?: string | null;
  disposalRemarks?: string | null;
  assets: DisposalAssetPick[];
};

export type CreateDisposalResult = {
  disposalId: number;
  itemCount: number;
};
