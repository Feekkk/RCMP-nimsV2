import { Badge } from '@/components/ui/badge';
import { formatStatusLabel } from '@/lib/inventory-schema';
import { STATUS_ID } from '@/lib/asset-status-actions';
import { cn } from '@/lib/utils';

/** Semantic badge colors per status_id (see status.md). */
export function getStatusBadgeClassName(statusId: number): string {
  switch (statusId) {
    case STATUS_ID.NEW:
      return 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200';
    case STATUS_ID.ASSIGN:
      return 'border-indigo-200 bg-indigo-50 text-indigo-800 hover:bg-indigo-50 dark:border-indigo-800 dark:bg-indigo-950 dark:text-indigo-200';
    case STATUS_ID.DEPLOY:
      return 'border-sky-200 bg-sky-50 text-sky-800 hover:bg-sky-50 dark:border-sky-800 dark:bg-sky-950 dark:text-sky-200';
    case STATUS_ID.RETURN:
      return 'border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-50 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200';
    case STATUS_ID.DISPOSED:
      return 'border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300';
    case STATUS_ID.REQUEST_ACTIVE:
    case STATUS_ID.REQUEST_BOOKED:
    case STATUS_ID.REQUEST_CHECKOUT:
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
