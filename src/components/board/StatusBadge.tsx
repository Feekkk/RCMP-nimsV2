import { STATUS_CONFIG, type FeatureStatus } from '@/lib/constants';

interface StatusBadgeProps {
  status: string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status as FeatureStatus] ?? { label: status, colorClass: 'text-muted-foreground', bgClass: 'bg-muted' };

  return (
    <span className={`inline-flex items-center rounded-[8px] px-2.5 py-0.5 text-xs font-medium ${config.colorClass} ${config.bgClass}`}>
      {config.label}
    </span>
  );
}
