export const STATUS_OPTIONS = [
  'New',
  'Under Review',
  'Planned',
  'In Progress',
  'Shipped',
  'Declined',
] as const;

export type FeatureStatus = (typeof STATUS_OPTIONS)[number];

export const STATUS_CONFIG: Record<FeatureStatus, { label: string; colorClass: string; bgClass: string }> = {
  'New': { label: 'New', colorClass: 'text-status-new', bgClass: 'bg-status-new/10' },
  'Under Review': { label: 'Under review', colorClass: 'text-status-review', bgClass: 'bg-status-review/10' },
  'Planned': { label: 'Planned', colorClass: 'text-status-planned', bgClass: 'bg-status-planned/10' },
  'In Progress': { label: 'In progress', colorClass: 'text-status-progress', bgClass: 'bg-status-progress/10' },
  'Shipped': { label: 'Shipped', colorClass: 'text-status-shipped', bgClass: 'bg-status-shipped/10' },
  'Declined': { label: 'Declined', colorClass: 'text-status-declined', bgClass: 'bg-status-declined/10' },
};

export const CATEGORY_OPTIONS = [
  'Frontend',
  'Backend',
  'Design',
  'DevOps',
  'Mobile',
  'Analytics',
  'Integrations',
  'Other',
] as const;
