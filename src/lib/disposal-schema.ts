import type { AssetKind } from '@/lib/inventory-schema';
import { STATUS_ID } from '@/lib/asset-status-actions';

/** Assets eligible for disposal: returned (2). */
export const DISPOSAL_ELIGIBLE_STATUS_IDS = [
  STATUS_ID.RETURN,
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
