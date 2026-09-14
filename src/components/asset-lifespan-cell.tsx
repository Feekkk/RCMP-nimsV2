import { Info } from 'lucide-react';
import { formatAssetLifespan, isAssetLifespanOverYears } from '@shared/lib/date-format';
import type { AssetId } from '@shared/lib/inventory-schema';
import { cn } from '@/lib/utils';

export function AssetLifespanCell({
  poDate,
  doDate,
  assetId,
}: {
  poDate?: string | null;
  doDate?: string | null;
  assetId: AssetId;
}) {
  const startDate = poDate || doDate;
  const label = formatAssetLifespan(startDate, assetId);
  if (label === '—') {
    return <span className="text-muted-foreground">—</span>;
  }

  const overTen = isAssetLifespanOverYears(startDate, assetId, 10);
  const overSeven = isAssetLifespanOverYears(startDate, assetId, 7);

  return (
    <div
      className={cn(
        'inline-flex min-w-0 items-center gap-1.5',
        overTen
          ? 'text-rose-700 dark:text-rose-400'
          : overSeven
            ? 'text-amber-700 dark:text-amber-400'
            : 'text-foreground',
      )}
      title={overTen ? 'Over 10 years' : overSeven ? 'Over 7 years' : undefined}
    >
      {overSeven ? <Info className="h-3.5 w-3.5 shrink-0" aria-hidden /> : null}
      <span className="whitespace-nowrap text-sm font-medium">{label}</span>
    </div>
  );
}
