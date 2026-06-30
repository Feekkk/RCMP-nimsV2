import type { ElementType } from 'react';
import { PackageCheck, PackageX } from 'lucide-react';
import { countStockAssets, type StockStatusCount } from '@/hooks/assets';
import { formatStatusLabel } from '@/lib/inventory-schema';

function StatusBreakdown({ rows }: { rows: StockStatusCount[] }) {
  return (
    <ul className="mt-2 space-y-1 border-t border-border/60 pt-2">
      {rows.map(({ statusId, count }) => (
        <li
          key={statusId}
          className="flex items-center justify-between gap-3 text-xs text-muted-foreground"
        >
          <span className="min-w-0 truncate capitalize">{formatStatusLabel(statusId)}</span>
          <span className="shrink-0 tabular-nums font-medium text-foreground">{count}</span>
        </li>
      ))}
    </ul>
  );
}

function StockCountCard({
  icon: Icon,
  label,
  value,
  breakdown,
  tint,
}: {
  icon: ElementType;
  label: string;
  value: number;
  breakdown: StockStatusCount[];
  tint: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-[14px] border border-border bg-card p-4">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] ${tint}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="text-xl font-bold tabular-nums text-foreground">{value}</p>
        <StatusBreakdown rows={breakdown} />
      </div>
    </div>
  );
}

export function AssetStockSummary({ items }: { items: { statusId: number }[] }) {
  const { instock, outstock, instockByStatus, outstockByStatus } = countStockAssets(items);
  return (
    <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:mb-6">
      <StockCountCard
        icon={PackageCheck}
        label="In stock"
        value={instock}
        breakdown={instockByStatus}
        tint="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
      />
      <StockCountCard
        icon={PackageX}
        label="Out of stock"
        value={outstock}
        breakdown={outstockByStatus}
        tint="bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200"
      />
    </div>
  );
}
