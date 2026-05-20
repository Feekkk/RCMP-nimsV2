import { useCallback, useEffect, useMemo, useState, type ElementType } from 'react';
import { Link } from '@tanstack/react-router';
import {
  ClipboardList,
  Hammer,
  History,
  Laptop,
  MapPin,
  Network,
  Package,
  Reply,
  Search,
  Shield,
  Trash2,
  Truck,
  Tv,
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import type { AssetKind } from '@/lib/inventory-schema';
import { ASSET_KIND_LABEL } from '@/lib/inventory-schema';
import {
  ACTIVITY_CATEGORY_LABEL,
  ACTIVITY_LOG_CATEGORIES,
  type ActivityLogCategory,
  type ActivityLogEntry,
} from '@/lib/activity-log-schema';
import { isoToLocalDate, localDateToIso } from '@/lib/date-format';
import { cn } from '@/lib/utils';
import { listActivityLogFn } from '@/server/activity-log.functions';
import { DatePickerField } from '@/technician/deploy-return-fields';
import { TechnicianShell } from '@/technician/technician-shell';

type CategoryFilter = 'all' | ActivityLogCategory;
type KindFilter = 'all' | AssetKind;

const CATEGORY_STYLE: Record<
  ActivityLogCategory,
  { icon: ElementType; dot: string; badge: string }
> = {
  request: {
    icon: ClipboardList,
    dot: 'bg-[oklch(0.55_0.14_290)] ring-[oklch(0.55_0.14_290)]/25',
    badge: 'bg-lavender/15 text-[oklch(0.45_0.12_290)] border-lavender/30',
  },
  handover: {
    icon: Truck,
    dot: 'bg-sky-500 ring-sky-500/25',
    badge: 'bg-sky-50 text-sky-800 border-sky-200 dark:bg-sky-950 dark:text-sky-200 dark:border-sky-800',
  },
  deployment: {
    icon: MapPin,
    dot: 'bg-indigo-500 ring-indigo-500/25',
    badge: 'bg-indigo-50 text-indigo-800 border-indigo-200 dark:bg-indigo-950 dark:text-indigo-200 dark:border-indigo-800',
  },
  return: {
    icon: Reply,
    dot: 'bg-emerald-500 ring-emerald-500/25',
    badge: 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-200 dark:border-emerald-800',
  },
  disposal: {
    icon: Trash2,
    dot: 'bg-rose-500 ring-rose-500/25',
    badge: 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950 dark:text-rose-200 dark:border-rose-800',
  },
  repair: {
    icon: Hammer,
    dot: 'bg-amber-500 ring-amber-500/25',
    badge: 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950 dark:text-amber-200 dark:border-amber-800',
  },
  warranty: {
    icon: Shield,
    dot: 'bg-violet-500 ring-violet-500/25',
    badge: 'bg-violet-50 text-violet-800 border-violet-200 dark:bg-violet-950 dark:text-violet-200 dark:border-violet-800',
  },
  inventory: {
    icon: Package,
    dot: 'bg-slate-500 ring-slate-500/25',
    badge: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-900 dark:text-slate-200 dark:border-slate-700',
  },
};

function formatWhen(at: string): string {
  if (!at) return '—';
  const d = new Date(at);
  return Number.isNaN(d.getTime())
    ? at
    : d.toLocaleString(undefined, {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
}

function dayKey(at: string): string {
  const d = new Date(at);
  if (Number.isNaN(d.getTime())) return 'unknown';
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function startOfDayMs(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

function endOfDayMs(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999).getTime();
}

/** Inclusive local-date range; `at` may be ISO date or datetime. */
function matchesDateFilter(at: string, fromIso: string, toIso: string): boolean {
  if (!fromIso && !toIso) return true;
  const eventMs = new Date(at).getTime();
  if (Number.isNaN(eventMs)) return false;

  if (fromIso) {
    const from = isoToLocalDate(fromIso);
    if (from && eventMs < startOfDayMs(from)) return false;
  }
  if (toIso) {
    const to = isoToLocalDate(toIso);
    if (to && eventMs > endOfDayMs(to)) return false;
  }
  return true;
}

function dayHeading(key: string): string {
  if (key === 'unknown') return 'Unknown date';
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const fmt = (d: Date) =>
    d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  if (key === fmt(today)) return 'Today';
  if (key === fmt(yesterday)) return 'Yesterday';
  return key;
}

function KindIcon({ kind }: { kind: AssetKind }) {
  const Icon = kind === 'laptop' ? Laptop : kind === 'av' ? Tv : Network;
  return <Icon className="h-3 w-3 shrink-0 opacity-70" />;
}

function ActivityStat({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-[10px] border px-3 py-2 text-left transition-colors',
        active
          ? 'border-[oklch(0.55_0.14_290)]/40 bg-lavender/10 shadow-sm'
          : 'border-border bg-card hover:bg-secondary/60',
      )}
    >
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-lg font-bold tabular-nums text-foreground">{count}</p>
    </button>
  );
}

function TimelineEvent({ entry }: { entry: ActivityLogEntry }) {
  const style = CATEGORY_STYLE[entry.category];
  const Icon = style.icon;

  return (
    <li className="relative flex gap-4 pb-8 last:pb-0">
      <span
        className={cn(
          'relative z-10 mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ring-4 ring-background',
          style.dot,
        )}
        aria-hidden
      >
        <Icon className="h-4 w-4 text-white" />
      </span>

      <div className="min-w-0 flex-1 rounded-[12px] border border-border/80 bg-card p-4 shadow-sm transition-shadow hover:shadow-md">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-foreground">{entry.title}</span>
              <Badge variant="outline" className={cn('rounded-[6px] text-[10px] font-medium', style.badge)}>
                {ACTIVITY_CATEGORY_LABEL[entry.category]}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">{formatWhen(entry.at)}</p>
          </div>
          {entry.actor && (
            <span className="shrink-0 rounded-[8px] bg-secondary/80 px-2 py-1 text-[11px] text-muted-foreground">
              {entry.actor}
            </span>
          )}
        </div>

        {entry.detail && (
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{entry.detail}</p>
        )}

        <div className="mt-3 flex flex-wrap gap-2">
          {entry.assetKind != null && entry.assetId != null && (
            <Button variant="outline" size="sm" className="h-7 gap-1 rounded-[8px] text-xs" asChild>
              <Link
                to="/technician/asset/$kind/$assetId"
                params={{ kind: entry.assetKind, assetId: entry.assetId }}
              >
                <KindIcon kind={entry.assetKind} />
                {ASSET_KIND_LABEL[entry.assetKind]} #{entry.assetId}
              </Link>
            </Button>
          )}
          {entry.requestId != null && (
            <Button variant="ghost" size="sm" className="h-7 rounded-[8px] text-xs" asChild>
              <Link to="/technician/request-log">Request #{entry.requestId}</Link>
            </Button>
          )}
        </div>
      </div>
    </li>
  );
}

export function TechnicianHistoryPage() {
  const [entries, setEntries] = useState<ActivityLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [kindFilter, setKindFilter] = useState<KindFilter>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const dateRangeInvalid = useMemo(() => {
    if (!dateFrom || !dateTo) return false;
    const from = isoToLocalDate(dateFrom);
    const to = isoToLocalDate(dateTo);
    return Boolean(from && to && from > to);
  }, [dateFrom, dateTo]);

  const hasDateFilter = Boolean(dateFrom || dateTo);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setEntries(await listActivityLogFn());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load activity log');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const countsByCategory = useMemo(() => {
    const map = Object.fromEntries(ACTIVITY_LOG_CATEGORIES.map((c) => [c, 0])) as Record<
      ActivityLogCategory,
      number
    >;
    for (const e of entries) map[e.category]++;
    return map;
  }, [entries]);

  const filtered = useMemo(() => {
    if (dateRangeInvalid) return [];
    const q = search.trim().toLowerCase();
    return entries.filter((e) => {
      if (categoryFilter !== 'all' && e.category !== categoryFilter) return false;
      if (kindFilter !== 'all' && e.assetKind !== kindFilter) return false;
      if (!matchesDateFilter(e.at, dateFrom, dateTo)) return false;
      if (!q) return true;
      return [
        e.title,
        e.detail,
        e.actor,
        e.category,
        ACTIVITY_CATEGORY_LABEL[e.category],
        e.assetKind,
        e.assetId != null ? String(e.assetId) : null,
        e.requestId != null ? String(e.requestId) : null,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(q);
    });
  }, [entries, search, categoryFilter, kindFilter, dateFrom, dateTo, dateRangeInvalid]);

  const grouped = useMemo(() => {
    const map = new Map<string, ActivityLogEntry[]>();
    for (const e of filtered) {
      const key = dayKey(e.at);
      const list = map.get(key) ?? [];
      list.push(e);
      map.set(key, list);
    }
    return [...map.entries()];
  }, [filtered]);

  return (
    <TechnicianShell>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Activity history</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Unified audit trail — borrow requests, handovers, deployments, returns, disposal,
            repairs, warranty, and new inventory.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="shrink-0 rounded-[8px]"
          disabled={loading}
          onClick={() => void load()}
        >
          Refresh
        </Button>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
        <ActivityStat
          label="All"
          count={entries.length}
          active={categoryFilter === 'all'}
          onClick={() => setCategoryFilter('all')}
        />
        {ACTIVITY_LOG_CATEGORIES.map((cat) => (
          <ActivityStat
            key={cat}
            label={ACTIVITY_CATEGORY_LABEL[cat].split(' ')[0]}
            count={countsByCategory[cat]}
            active={categoryFilter === cat}
            onClick={() => setCategoryFilter(cat)}
          />
        ))}
      </div>

      <Card className="mb-6 rounded-[14px] border-border shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Filters</CardTitle>
          <CardDescription>
            {filtered.length} event{filtered.length === 1 ? '' : 's'}
            {filtered.length !== entries.length && ` of ${entries.length}`}
            {dateRangeInvalid && ' · End date must be on or after start date'}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search events, assets, staff…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-10 rounded-[10px] pl-9"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto] lg:items-end">
            <DatePickerField label="From date" value={dateFrom} onChange={setDateFrom} />
            <DatePickerField label="To date" value={dateTo} onChange={setDateTo} />
            <div className="flex flex-wrap gap-2 sm:col-span-2 lg:col-span-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-[8px]"
                disabled={!hasDateFilter}
                onClick={() => {
                  setDateFrom('');
                  setDateTo('');
                }}
              >
                Clear dates
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="rounded-[8px]"
                onClick={() => {
                  const today = new Date();
                  const weekAgo = new Date(today);
                  weekAgo.setDate(weekAgo.getDate() - 7);
                  setDateFrom(localDateToIso(weekAgo));
                  setDateTo(localDateToIso(today));
                }}
              >
                Last 7 days
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="rounded-[8px]"
                onClick={() => {
                  const today = new Date();
                  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
                  setDateFrom(localDateToIso(monthStart));
                  setDateTo(localDateToIso(today));
                }}
              >
                This month
              </Button>
            </div>
          </div>
          <ToggleGroup
            type="single"
            value={kindFilter}
            onValueChange={(v) => {
              if (v) setKindFilter(v as KindFilter);
            }}
            className="flex flex-wrap justify-start gap-1"
          >
            <ToggleGroupItem value="all" className="rounded-[8px] px-3 text-xs">
              All assets
            </ToggleGroupItem>
            <ToggleGroupItem value="laptop" className="rounded-[8px] px-3 text-xs">
              Laptop
            </ToggleGroupItem>
            <ToggleGroupItem value="av" className="rounded-[8px] px-3 text-xs">
              AV
            </ToggleGroupItem>
            <ToggleGroupItem value="network" className="rounded-[8px] px-3 text-xs">
              Network
            </ToggleGroupItem>
          </ToggleGroup>
        </CardContent>
      </Card>

      <Card className="rounded-[14px] border-border shadow-sm">
        <CardHeader className="border-b border-border pb-4">
          <CardTitle className="text-base">Timeline</CardTitle>
          <CardDescription>Newest events first, grouped by day</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="max-h-[min(72vh,800px)]">
            <div className="px-4 py-6 sm:px-6">
              {loading ? (
                <p className="py-16 text-center text-sm text-muted-foreground">Loading activity…</p>
              ) : grouped.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-[12px] border border-dashed border-border py-16 text-center">
                  <History className="mb-3 h-10 w-10 text-muted-foreground/40" />
                  <p className="text-sm font-medium text-foreground">No events match</p>
                  <p className="mt-1 max-w-sm text-xs text-muted-foreground">
                    Try clearing search, date range, or other filters.
                  </p>
                </div>
              ) : (
                grouped.map(([day, dayEvents]) => (
                  <section key={day} className="mb-10 last:mb-0">
                    <div className="sticky top-0 z-20 mb-4 flex items-center gap-3 bg-card/95 py-2 backdrop-blur-sm">
                      <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        {dayHeading(day)}
                      </span>
                      <span className="h-px flex-1 bg-border" />
                      <Badge variant="secondary" className="rounded-[6px] tabular-nums">
                        {dayEvents.length}
                      </Badge>
                    </div>
                    <ol className="relative border-l border-border/80 pl-2 ml-4 sm:ml-5">
                      {dayEvents.map((entry) => (
                        <TimelineEvent key={entry.id} entry={entry} />
                      ))}
                    </ol>
                  </section>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      <p className="mt-4 text-center text-xs text-muted-foreground">
        Borrow-request detail:{' '}
        <Link to="/technician/request-log" className="font-medium text-[oklch(0.45_0.12_290)] hover:underline">
          Request log
        </Link>
      </p>
    </TechnicianShell>
  );
}
