import type { AssetId, AssetKind } from '@shared/lib/inventory-schema';

export const ACTIVITY_LOG_CATEGORIES = [
  'request',
  'handover',
  'deployment',
  'return',
  'maintenance',
  'inventory',
] as const;

export type ActivityLogCategory = (typeof ACTIVITY_LOG_CATEGORIES)[number];

export const ACTIVITY_CATEGORY_LABEL: Record<ActivityLogCategory, string> = {
  request: 'Borrow request',
  handover: 'Handover',
  deployment: 'Deployment',
  return: 'Return',
  maintenance: 'Preventive maintenance',
  inventory: 'Inventory',
};

export type ActivityLogEntry = {
  id: string;
  at: string;
  sortKey: number;
  category: ActivityLogCategory;
  title: string;
  detail: string | null;
  actor: string | null;
  assetKind: AssetKind | null;
  assetId: AssetId | null;
  requestId: number | null;
};
