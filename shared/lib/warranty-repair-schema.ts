import type { AssetId, AssetKind } from '@shared/lib/inventory-schema';
import type { WarrantyInput } from '@/lib/warranty-field-utils';

export type { WarrantyInput };
export { WARRANTY_FIELD_COLUMNS } from '@/lib/warranty-field-utils';

export type WarrantyRecord = {
  warrantyId: number;
  assetId: AssetId;
  assetType: AssetKind;
  startDate: string;
  endDate: string;
  remarks: string | null;
};

export type WarrantyContext = {
  warranty: WarrantyRecord | null;
  isActive: boolean;
};
