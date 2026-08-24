import type { AssetKind } from '@shared/lib/inventory-schema';

export type PredisposalEligibleAsset = {
  kind: AssetKind;
  assetId: number;
  assetIdOld: string | null;
  model: string | null;
  brand: string | null;
  category: string | null;
  serialNum: string | null;
  statusId: number;
  poDate: string | null;
};

export type MarkPredisposedAssetInput = {
  kind: AssetKind;
  assetId: number;
};

export type MarkAssetsPredisposedInput = {
  assets: MarkPredisposedAssetInput[];
};

export type MarkAssetsPredisposedResult = {
  updated: number;
  errors: string[];
};
