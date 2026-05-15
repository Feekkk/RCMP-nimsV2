export const CATEGORY_OPTIONS = [
  'Electronics',
  'Office Supplies',
  'Furniture',
  'Tools',
  'Raw Materials',
  'Packaging',
  'Other',
] as const;

export const LOCATION_OPTIONS = [
  'Warehouse A',
  'Warehouse B',
  'Storefront',
  'Office',
  'Other',
] as const;

export type ItemStatus = 'in_stock' | 'low_stock' | 'out_of_stock';

export const STATUS_CONFIG: Record<ItemStatus, { label: string; colorClass: string; bgClass: string }> = {
  in_stock: { label: 'In stock', colorClass: 'text-emerald-700', bgClass: 'bg-emerald-100' },
  low_stock: { label: 'Low stock', colorClass: 'text-amber-700', bgClass: 'bg-amber-100' },
  out_of_stock: { label: 'Out of stock', colorClass: 'text-rose-700', bgClass: 'bg-rose-100' },
};
