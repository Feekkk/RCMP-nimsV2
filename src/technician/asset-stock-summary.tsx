import type { ElementType } from 'react';
import { PackageCheck, PackageX } from 'lucide-react';
import { countStockAssets, type StockStatusCount } from '@/hooks/assets';
import { STATUS_ID } from '@/lib/asset-status-actions';
import { CAMPUS_BUILDINGS } from '@/lib/deploy-return-schema';
import { formatStatusLabel, OUTSTOCK_STATUS_IDS } from '@/lib/inventory-schema';

type BreakdownRow = {
  key: string;
  label: string;
  count: number;
};

function BreakdownList({ rows }: { rows: BreakdownRow[] }) {
  return (
    <ul className="mt-2 space-y-1 border-t border-border/60 pt-2">
      {rows.map(({ key, label, count }) => (
        <li
          key={key}
          className="flex items-center justify-between gap-3 text-xs text-muted-foreground"
        >
          <span className="min-w-0 truncate capitalize">{label}</span>
          <span className="shrink-0 tabular-nums font-medium text-foreground">{count}</span>
        </li>
      ))}
    </ul>
  );
}

function statusRowsToBreakdown(rows: StockStatusCount[]): BreakdownRow[] {
  return rows.map(({ statusId, count }) => ({
    key: `status:${statusId}`,
    label: formatStatusLabel(statusId),
    count,
  }));
}

function outstockBuildingBreakdown(
  items: { statusId: number; building?: string | null }[],
): BreakdownRow[] {
  const buildingCounts = new Map<string, number>();
  for (const building of CAMPUS_BUILDINGS) {
    buildingCounts.set(building, 0);
  }

  const otherStatusCounts = new Map<number, number>();

  for (const item of items) {
    if (item.statusId === STATUS_ID.DEPLOY) {
      const building = item.building?.trim() || 'Unknown';
      buildingCounts.set(building, (buildingCounts.get(building) ?? 0) + 1);
      continue;
    }
    if (!(OUTSTOCK_STATUS_IDS as readonly number[]).includes(item.statusId)) continue;
    otherStatusCounts.set(item.statusId, (otherStatusCounts.get(item.statusId) ?? 0) + 1);
  }

  const campusSet = new Set<string>(CAMPUS_BUILDINGS);
  const rows: BreakdownRow[] = CAMPUS_BUILDINGS.map((building) => ({
    key: `building:${building}`,
    label: building,
    count: buildingCounts.get(building) ?? 0,
  }));

  for (const [building, count] of buildingCounts) {
    if (campusSet.has(building)) continue;
    rows.push({ key: `building:${building}`, label: building, count });
  }

  for (const statusId of OUTSTOCK_STATUS_IDS) {
    if (statusId === STATUS_ID.DEPLOY) continue;
    rows.push({
      key: `status:${statusId}`,
      label: formatStatusLabel(statusId),
      count: otherStatusCounts.get(statusId) ?? 0,
    });
  }

  return rows;
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
  breakdown: BreakdownRow[];
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
        <BreakdownList rows={breakdown} />
      </div>
    </div>
  );
}

export function AssetStockSummary({
  items,
}: {
  items: { statusId: number; building?: string | null }[];
}) {
  const { instock, outstock, instockByStatus } = countStockAssets(items);
  return (
    <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:mb-6">
      <StockCountCard
        icon={PackageCheck}
        label="In stock"
        value={instock}
        breakdown={statusRowsToBreakdown(instockByStatus)}
        tint="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
      />
      <StockCountCard
        icon={PackageX}
        label="Out of stock"
        value={outstock}
        breakdown={outstockBuildingBreakdown(items)}
        tint="bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200"
      />
    </div>
  );
}
