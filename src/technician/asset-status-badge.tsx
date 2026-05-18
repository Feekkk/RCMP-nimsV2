import { Badge } from '@/components/ui/badge';
import { formatStatusLabel } from '@/lib/inventory-schema';
import { STATUS_ID } from '@/lib/asset-status-actions';
import { cn } from '@/lib/utils';

/** Semantic badge colors per status_id (green / blue / amber / red / etc.). */
export function getStatusBadgeClassName(statusId: number): string {
  switch (statusId) {
    case STATUS_ID.ACTIVE:
    case STATUS_ID.ONLINE:
      return 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200';
    case STATUS_ID.NON_ACTIVE:
    case STATUS_ID.DISPOSED:
      return 'border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300';
    case STATUS_ID.DEPLOY:
      return 'border-sky-200 bg-sky-50 text-sky-800 hover:bg-sky-50 dark:border-sky-800 dark:bg-sky-950 dark:text-sky-200';
    case STATUS_ID.FAULTY:
      return 'border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-50 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200';
    case STATUS_ID.LOST:
      return 'border-rose-200 bg-rose-50 text-rose-800 hover:bg-rose-50 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-200';
    case STATUS_ID.OFFLINE:
      return 'border-yellow-200 bg-yellow-50 text-yellow-900 hover:bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950 dark:text-yellow-200';
    case 9:
    case 10:
    case 11:
      return 'border-violet-200 bg-violet-50 text-violet-800 hover:bg-violet-50 dark:border-violet-800 dark:bg-violet-950 dark:text-violet-200';
    default:
      return 'border-border bg-muted text-muted-foreground';
  }
}

export function AssetStatusBadge({ statusId }: { statusId: number }) {
  return (
    <Badge
      variant="outline"
      className={cn('rounded-[8px] text-[10px] font-semibold capitalize', getStatusBadgeClassName(statusId))}
    >
      {formatStatusLabel(statusId)}
    </Badge>
  );
}
