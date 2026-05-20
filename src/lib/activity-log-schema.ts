import type { AssetKind } from '@/lib/inventory-schema';

export const ACTIVITY_LOG_CATEGORIES = [
  'request',
  'handover',
  'deployment',
  'return',
  'disposal',
  'repair',
  'warranty',
  'inventory',
] as const;

export type ActivityLogCategory = (typeof ACTIVITY_LOG_CATEGORIES)[number];

export const ACTIVITY_CATEGORY_LABEL: Record<ActivityLogCategory, string> = {
  request: 'Borrow request',
  handover: 'Handover',
  deployment: 'Deployment',
  return: 'Return',
  disposal: 'Disposal',
  repair: 'Repair',
  warranty: 'Warranty',
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
  assetId: number | null;
  requestId: number | null;
  disposalId: number | null;
};
