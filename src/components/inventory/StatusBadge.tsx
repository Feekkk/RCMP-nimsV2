import { STATUS_CONFIG, type ItemStatus } from '@/lib/constants';
import { cn } from '@/lib/utils';

export function StatusBadge({ status, className }: { status: ItemStatus; className?: string }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span className={cn(
      'inline-flex items-center rounded-[6px] px-2 py-0.5 text-[11px] font-semibold',
      cfg.bgClass,
      cfg.colorClass,
      className,
    )}>
      {cfg.label}
    </span>
  );
}
