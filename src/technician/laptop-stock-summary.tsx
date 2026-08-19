import type { ElementType } from 'react';
import { Laptop as LaptopIcon, Monitor } from 'lucide-react';
import { isDesktopCategory, isNotebookCategory } from '@/hooks/assetid-generator';
import {
  formatStatusLabel,
  LAPTOP_ASSIGNMENT_BUCKETS,
  matchesAssignmentBucket,
  type LaptopAsset,
  type LaptopAssignmentBucket,
} from '@/lib/inventory-schema';
import { InsightStatCard } from '@/components/insight-stat-card';
import { cn } from '@/lib/utils';

export type LaptopFormFactorFilter = 'all' | 'laptop' | 'desktop';

const STOCK_SUMMARY_STATUS_IDS = [1, 2, 3, 5] as const;

type StatusCount = {
  statusId: number;
  label: string;
  count: number;
};

type LabelCount = {
  label: LaptopAssignmentBucket;
  count: number;
};

function StatusMetricGrid({
  rows,
  formFactor,
  statusFilter,
  formFactorFilter,
  onStatusClick,
}: {
  rows: StatusCount[];
  formFactor: 'laptop' | 'desktop';
  statusFilter: number | null;
  formFactorFilter: LaptopFormFactorFilter;
  onStatusClick: (formFactor: 'laptop' | 'desktop', statusId: number) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
      {rows.map(({ statusId, label, count }) => {
        const isActive = statusFilter === statusId && formFactorFilter === formFactor;

        return (
          <button
            key={statusId}
            type="button"
            title={`Filter table by ${label}`}
            onClick={() => onStatusClick(formFactor, statusId)}
            className={cn(
              'rounded-[8px] bg-background/80 px-2 py-1.5 text-left ring-1 ring-border/50 transition-colors',
              'hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              isActive && 'bg-primary/10 ring-2 ring-primary/40',
              count === 0 && 'opacity-60',
            )}
          >
            <p className="truncate text-[10px] capitalize leading-tight text-muted-foreground">{label}</p>
            <p className="mt-0.5 text-sm font-semibold tabular-nums text-foreground">{count}</p>
          </button>
        );
      })}
    </div>
  );
}

function DivisionSplit({
  rows,
  formFactor,
  divisionFilter,
  formFactorFilter,
  onDivisionClick,
}: {
  rows: LabelCount[];
  formFactor: 'laptop' | 'desktop';
  divisionFilter: LaptopAssignmentBucket | null;
  formFactorFilter: LaptopFormFactorFilter;
  onDivisionClick: (formFactor: 'laptop' | 'desktop', division: LaptopAssignmentBucket) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {rows.map(({ label, count }) => {
        const isActive = divisionFilter === label && formFactorFilter === formFactor;

        return (
          <button
            key={label}
            type="button"
            title={`Filter table by ${label}`}
            onClick={() => onDivisionClick(formFactor, label)}
            className={cn(
              'flex items-center justify-between gap-2 rounded-[10px] bg-background/80 px-3 py-2.5 text-left ring-1 ring-border/50 transition-colors',
              'hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              isActive && 'bg-primary/10 ring-2 ring-primary/40',
              count === 0 && 'opacity-60',
            )}
          >
            <span className="text-xs font-medium capitalize text-muted-foreground">{label}</span>
            <span className="text-lg font-bold tabular-nums text-foreground">{count}</span>
          </button>
        );
      })}
    </div>
  );
}

function FormFactorCard({
  icon: Icon,
  label,
  formFactor,
  value,
  statusRows,
  divisionRows,
  tone,
  statusFilter,
  formFactorFilter,
  divisionFilter,
  onStatusClick,
  onDivisionClick,
}: {
  icon: ElementType;
  label: string;
  formFactor: 'laptop' | 'desktop';
  value: number;
  statusRows: StatusCount[];
  divisionRows: LabelCount[];
  tone: 'lime' | 'violet';
  statusFilter: number | null;
  formFactorFilter: LaptopFormFactorFilter;
  divisionFilter: LaptopAssignmentBucket | null;
  onStatusClick: (formFactor: 'laptop' | 'desktop', statusId: number) => void;
  onDivisionClick: (formFactor: 'laptop' | 'desktop', division: LaptopAssignmentBucket) => void;
}) {
  return (
    <InsightStatCard icon={Icon} label={label} value={value} tone={tone}>
      <div className="space-y-3">
        <div>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            By status
          </p>
          <StatusMetricGrid
            rows={statusRows}
            formFactor={formFactor}
            statusFilter={statusFilter}
            formFactorFilter={formFactorFilter}
            onStatusClick={onStatusClick}
          />
        </div>

        <div>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Academic / Services / Facility
          </p>
          <DivisionSplit
            rows={divisionRows}
            formFactor={formFactor}
            divisionFilter={divisionFilter}
            formFactorFilter={formFactorFilter}
            onDivisionClick={onDivisionClick}
          />
        </div>
      </div>
    </InsightStatCard>
  );
}

function countStatusRows(items: LaptopAsset[]): StatusCount[] {
  const counts = new Map<number, number>();
  for (const item of items) {
    counts.set(item.statusId, (counts.get(item.statusId) ?? 0) + 1);
  }
  return STOCK_SUMMARY_STATUS_IDS.map((statusId) => ({
    statusId,
    label: formatStatusLabel(statusId),
    count: counts.get(statusId) ?? 0,
  }));
}

function countDivisionRows(items: LaptopAsset[]): LabelCount[] {
  return LAPTOP_ASSIGNMENT_BUCKETS.map((bucket) => ({
    label: bucket,
    count: items.filter((item) => matchesAssignmentBucket(item, bucket)).length,
  }));
}

type LaptopAssetStockSummaryProps = {
  items: LaptopAsset[];
  statusFilter: number | null;
  formFactorFilter: LaptopFormFactorFilter;
  divisionFilter: LaptopAssignmentBucket | null;
  onStatusClick: (formFactor: 'laptop' | 'desktop', statusId: number) => void;
  onDivisionClick: (formFactor: 'laptop' | 'desktop', division: LaptopAssignmentBucket) => void;
};

export function LaptopAssetStockSummary({
  items,
  statusFilter,
  formFactorFilter,
  divisionFilter,
  onStatusClick,
  onDivisionClick,
}: LaptopAssetStockSummaryProps) {
  const laptopItems = items.filter((item) => isNotebookCategory(item.category));
  const desktopItems = items.filter((item) => isDesktopCategory(item.category));

  return (
    <div className="mb-5 grid grid-cols-1 gap-3 sm:mb-6 sm:grid-cols-2">
      <FormFactorCard
        icon={LaptopIcon}
        label="Laptop"
        formFactor="laptop"
        value={laptopItems.length}
        statusRows={countStatusRows(laptopItems)}
        divisionRows={countDivisionRows(laptopItems)}
        tone="lime"
        statusFilter={statusFilter}
        formFactorFilter={formFactorFilter}
        divisionFilter={divisionFilter}
        onStatusClick={onStatusClick}
        onDivisionClick={onDivisionClick}
      />
      <FormFactorCard
        icon={Monitor}
        label="Desktop"
        formFactor="desktop"
        value={desktopItems.length}
        statusRows={countStatusRows(desktopItems)}
        divisionRows={countDivisionRows(desktopItems)}
        tone="violet"
        statusFilter={statusFilter}
        formFactorFilter={formFactorFilter}
        divisionFilter={divisionFilter}
        onStatusClick={onStatusClick}
        onDivisionClick={onDivisionClick}
      />
    </div>
  );
}
