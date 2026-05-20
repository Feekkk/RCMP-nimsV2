import type { ElementType } from 'react';
import { PackageCheck, PackageX } from 'lucide-react';
import { countStockAssets } from '@/hooks/assets';

function StockCountCard({
  icon: Icon,
  label,
  value,
  tint,
}: {
  icon: ElementType;
  label: string;
  value: number;
  tint: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-[14px] border border-border bg-card p-4">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] ${tint}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="text-xl font-bold tabular-nums text-foreground">{value}</p>
      </div>
    </div>
  );
}

export function AssetStockSummary({ items }: { items: { statusId: number }[] }) {
  const { instock, outstock } = countStockAssets(items);
  return (
    <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:mb-6">
      <StockCountCard
        icon={PackageCheck}
        label="In stock"
        value={instock}
        tint="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
      />
      <StockCountCard
        icon={PackageX}
        label="Out of stock"
        value={outstock}
        tint="bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200"
      />
    </div>
  );
}
