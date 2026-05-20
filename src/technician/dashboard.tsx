import { useCallback, useEffect, useMemo, useState, type ElementType, type ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import {
  AlertCircle,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Laptop,
  Loader2,
  MoreVertical,
  Network,
  Package,
  PackageCheck,
  Tv,
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DASHBOARD_REQUEST_STATUS_LABEL,
  type DashboardInventorySlice,
  type DashboardRequestStatus,
  type DashboardTimetableEntry,
  type TechnicianDashboardData,
  type TechnicianDashboardStats,
} from '@/lib/dashboard-schema';
import { formatDateLabel, isoToLocalDate, localDateToIso } from '@/lib/date-format';
import { cn } from '@/lib/utils';
import { getTechnicianDashboardFn } from '@/server/dashboard.functions';
import {
  InventoryMixChart,
  MiniSparkline,
  ProgramStackChart,
  RequestTrendChart,
} from '@/technician/dashboard-charts';
import { TechnicianShell } from '@/technician/technician-shell';

const EMPTY_SPARK = Array(7).fill(0);

const SPARK_COLORS = {
  pending: 'hsl(262 55% 58%)',
  checkout: 'hsl(210 70% 55%)',
  onLoan: 'hsl(239 84% 67%)',
  pool: 'hsl(152 60% 42%)',
};

const STATUS_BAR: Record<DashboardRequestStatus, string> = {
  preparing: 'bg-amber-400/90 dark:bg-amber-500',
  checkout: 'bg-sky-500/90 dark:bg-sky-600',
  in_use: 'bg-[oklch(0.55_0.14_290)]/90',
  due_return: 'bg-rose-500/90 dark:bg-rose-600',
};

const STATUS_BADGE: Record<DashboardRequestStatus, string> = {
  preparing:
    'bg-amber-50 text-amber-900 border-amber-200 dark:bg-amber-950 dark:text-amber-100 dark:border-amber-800',
  checkout:
    'bg-sky-50 text-sky-900 border-sky-200 dark:bg-sky-950 dark:text-sky-100 dark:border-sky-800',
  in_use: 'bg-lavender/15 text-[oklch(0.45_0.12_290)] border-lavender/30',
  due_return:
    'bg-rose-50 text-rose-900 border-rose-200 dark:bg-rose-950 dark:text-rose-100 dark:border-rose-800',
};

function DashboardPanel({
  title,
  description,
  headerExtra,
  children,
  className,
  contentClassName,
}: {
  title: string;
  description?: string;
  headerExtra?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}) {
  return (
    <Card className={cn('rounded-2xl border-border shadow-sm', className)}>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-4">
        <div className="min-w-0 space-y-1">
          <CardTitle className="text-base font-semibold">{title}</CardTitle>
          {description ? <CardDescription>{description}</CardDescription> : null}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {headerExtra}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-lg text-muted-foreground"
            aria-label="More options"
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className={cn('pt-0', contentClassName)}>{children}</CardContent>
    </Card>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  tint,
  sparkData,
  sparkColor,
  href,
}: {
  icon: ElementType;
  label: string;
  value: number;
  tint: string;
  sparkData: number[];
  sparkColor: string;
  href?: string;
}) {
  const inner = (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4 transition-shadow hover:shadow-sm">
      <div className="flex min-w-0 items-center gap-3">
        <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px]', tint)}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold tabular-nums text-foreground">{value}</p>
        </div>
      </div>
      <MiniSparkline data={sparkData} color={sparkColor} />
    </div>
  );

  if (href) {
    return (
      <Link to={href} className="block outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-2xl">
        {inner}
      </Link>
    );
  }
  return inner;
}

function weekDays(weekStartIso: string): { iso: string; label: string; short: string; isToday: boolean }[] {
  const start = isoToLocalDate(weekStartIso);
  if (!start) return [];
  const todayIso = localDateToIso(new Date());
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    const iso = localDateToIso(d);
    return {
      iso,
      label: d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' }),
      short: d.toLocaleDateString(undefined, { weekday: 'narrow' }),
      isToday: iso === todayIso,
    };
  });
}

function dayOffset(iso: string, weekStartIso: string): number {
  const d = isoToLocalDate(iso);
  const start = isoToLocalDate(weekStartIso);
  if (!d || !start) return -1;
  const ms = d.getTime() - start.getTime();
  return Math.round(ms / 86400000);
}

function barPlacement(entry: DashboardTimetableEntry, weekStartIso: string) {
  const startIdx = Math.max(0, dayOffset(entry.borrowDate, weekStartIso));
  const endIdx = Math.min(6, dayOffset(entry.returnDate, weekStartIso));
  if (startIdx > 6 || endIdx < 0) return null;
  const colStart = startIdx + 2;
  const span = endIdx - Math.max(0, startIdx) + 1;
  return { colStart, span };
}

function WeekNav({
  weekOffset,
  onPrev,
  onNext,
  onThisWeek,
}: {
  weekOffset: number;
  onPrev: () => void;
  onNext: () => void;
  onThisWeek: () => void;
}) {
  return (
    <div className="flex items-center gap-1">
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-8 w-8 rounded-lg"
        onClick={onPrev}
        aria-label="Previous week"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-8 rounded-lg px-2.5 text-xs tabular-nums"
        disabled={weekOffset === 0}
        onClick={onThisWeek}
      >
        This week
      </Button>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-8 w-8 rounded-lg"
        onClick={onNext}
        aria-label="Next week"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}

function RequestTimetable({
  entries,
  weekStart,
  weekEnd,
  loading,
  weekOffset,
  onPrevWeek,
  onNextWeek,
  onThisWeek,
}: {
  entries: DashboardTimetableEntry[];
  weekStart: string;
  weekEnd: string;
  loading: boolean;
  weekOffset: number;
  onPrevWeek: () => void;
  onNextWeek: () => void;
  onThisWeek: () => void;
}) {
  const days = useMemo(() => weekDays(weekStart), [weekStart]);

  return (
    <DashboardPanel
      title="Request timetable"
      description={`Borrow windows · ${formatDateLabel(weekStart)} – ${formatDateLabel(weekEnd)}`}
      headerExtra={
        <WeekNav
          weekOffset={weekOffset}
          onPrev={onPrevWeek}
          onNext={onNextWeek}
          onThisWeek={onThisWeek}
        />
      }
      contentClassName="p-0"
    >
      <div className="border-t border-border">
        <div className="flex flex-wrap gap-3 border-b border-border px-4 py-3 sm:px-6">
          {(Object.keys(STATUS_BAR) as DashboardRequestStatus[]).map((s) => (
            <span key={s} className="inline-flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <span className={cn('h-2 w-2 rounded-full', STATUS_BAR[s])} />
              {DASHBOARD_REQUEST_STATUS_LABEL[s]}
            </span>
          ))}
        </div>
        <ScrollArea className="max-h-[min(65vh,640px)]">
          <div className="min-w-[640px] p-4 sm:p-6">
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading timetable…
              </div>
            ) : entries.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border py-14 text-center text-sm text-muted-foreground">
                No borrow requests overlap this week.
              </div>
            ) : (
              <div
                className="grid gap-0 overflow-hidden rounded-xl border border-border"
                style={{
                  gridTemplateColumns: 'minmax(11rem, 14rem) repeat(7, minmax(4.5rem, 1fr))',
                }}
              >
                <div className="border-b border-r bg-muted/40 p-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Request
                </div>
                {days.map((d) => (
                  <div
                    key={d.iso}
                    className={cn(
                      'border-b border-r p-2 text-center text-[10px] font-semibold uppercase tracking-wide last:border-r-0',
                      d.isToday
                        ? 'bg-lavender/10 text-[oklch(0.45_0.12_290)]'
                        : 'bg-muted/40 text-muted-foreground',
                    )}
                  >
                    <div>{d.short}</div>
                    <div className="tabular-nums font-normal normal-case text-[9px] opacity-80">
                      {d.iso.slice(8)}
                    </div>
                  </div>
                ))}

                {entries.map((entry, rowIdx) => {
                  const placement = barPlacement(entry, weekStart);
                  const gridRow = rowIdx + 2;
                  return (
                    <div key={entry.requestId} className="contents">
                      <Link
                        to="/technician/requests"
                        className="flex flex-col justify-center gap-0.5 border-b border-r bg-card p-2 text-left hover:bg-secondary/40"
                        style={{ gridRow }}
                      >
                        <span className="truncate text-xs font-semibold text-foreground">
                          {entry.requesterName}
                        </span>
                        <span className="font-mono text-[10px] text-muted-foreground">#{entry.requestId}</span>
                        <span className="truncate text-[10px] text-muted-foreground">{entry.itemSummary}</span>
                        {entry.needsAction && (
                          <span className="mt-0.5 inline-flex w-fit items-center gap-1 text-[10px] font-medium text-amber-700 dark:text-amber-400">
                            <AlertCircle className="h-3 w-3" />
                            Action needed
                          </span>
                        )}
                      </Link>
                      {days.map((d, colIdx) => (
                        <div
                          key={d.iso}
                          className={cn(
                            'relative min-h-[3.25rem] border-b border-r bg-card/50 last:border-r-0',
                            d.isToday && 'bg-lavender/[0.04]',
                            colIdx === days.length - 1 && 'last:border-r-0',
                          )}
                          style={{ gridRow }}
                        />
                      ))}
                      {placement && (
                        <Link
                          to="/technician/requests"
                          title={`${entry.requesterName} · ${formatDateLabel(entry.borrowDate)} → ${formatDateLabel(entry.returnDate)}`}
                          className={cn(
                            'z-10 mx-1 flex min-h-[2rem] items-center self-center rounded-md px-2 py-1 text-[10px] font-medium text-white shadow-sm transition-opacity hover:opacity-95',
                            STATUS_BAR[entry.status],
                          )}
                          style={{
                            gridRow,
                            gridColumn: `${placement.colStart} / span ${placement.span}`,
                          }}
                        >
                          <span className="truncate">{DASHBOARD_REQUEST_STATUS_LABEL[entry.status]}</span>
                        </Link>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </DashboardPanel>
  );
}

const INVENTORY_BUCKET_LABEL: Record<keyof Omit<DashboardInventorySlice, 'kind'>, string> = {
  active: 'Active / online',
  deploy: 'Deployed',
  requestFlow: 'Request flow',
  maintenance: 'Other / maintenance',
};

function AssetDetailsPanel({
  stats,
  inventoryMix,
  loading,
}: {
  stats: TechnicianDashboardStats | undefined;
  inventoryMix: DashboardInventorySlice[];
  loading: boolean;
}) {
  const kindLinks = [
    {
      label: 'Laptop',
      count: stats?.laptopCount ?? 0,
      href: '/technician/laptop' as const,
      icon: Laptop,
    },
    {
      label: 'AV',
      count: stats?.avCount ?? 0,
      href: '/technician/av' as const,
      icon: Tv,
    },
    {
      label: 'Network',
      count: stats?.networkCount ?? 0,
      href: '/technician/network' as const,
      icon: Network,
    },
  ];

  const totals = inventoryMix.reduce(
    (acc, row) => ({
      active: acc.active + row.active,
      deploy: acc.deploy + row.deploy,
      requestFlow: acc.requestFlow + row.requestFlow,
      maintenance: acc.maintenance + row.maintenance,
    }),
    { active: 0, deploy: 0, requestFlow: 0, maintenance: 0 },
  );

  return (
    <DashboardPanel
      title="Asset inventory"
      description="Status breakdown across laptop, AV, and network"
      className="h-full"
      headerExtra={
        <Button variant="outline" size="sm" className="h-8 rounded-lg" asChild>
          <Link to="/technician/request-assets">Request pool ({stats?.requestPoolCount ?? 0})</Link>
        </Button>
      }
    >
      {loading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading assets…
        </div>
      ) : (
        <div className="space-y-5">
          <div className="grid grid-cols-3 gap-2">
            {kindLinks.map(({ label, count, href, icon: Icon }) => (
              <Link
                key={href}
                to={href}
                className="rounded-xl border border-border/80 bg-muted/30 p-3 transition-colors hover:bg-secondary/60"
              >
                <div className="mb-1 flex items-center gap-1.5 text-muted-foreground">
                  <Icon className="h-3.5 w-3.5" />
                  <span className="text-[10px] font-medium uppercase tracking-wide">{label}</span>
                </div>
                <p className="text-xl font-bold tabular-nums text-foreground">{count}</p>
              </Link>
            ))}
          </div>

          <InventoryMixChart data={inventoryMix} />

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {(Object.keys(INVENTORY_BUCKET_LABEL) as (keyof typeof INVENTORY_BUCKET_LABEL)[]).map(
              (key) => (
                <div
                  key={key}
                  className="rounded-lg border border-border/70 bg-card px-3 py-2 text-center"
                >
                  <p className="text-[10px] text-muted-foreground">{INVENTORY_BUCKET_LABEL[key]}</p>
                  <p className="text-lg font-bold tabular-nums">{totals[key]}</p>
                </div>
              ),
            )}
          </div>

          {inventoryMix.length > 0 && (
            <ScrollArea className="max-h-40">
              <div className="space-y-2 pr-2">
                {inventoryMix.map((row) => (
                  <div
                    key={row.kind}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/60 px-3 py-2 text-xs"
                  >
                    <span className="font-semibold text-foreground">{row.kind}</span>
                    <span className="text-muted-foreground">
                      Active {row.active} · Deploy {row.deploy} · Request {row.requestFlow} · Other{' '}
                      {row.maintenance}
                    </span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      )}
    </DashboardPanel>
  );
}

export function TechnicianDashboardPage() {
  const [weekOffset, setWeekOffset] = useState(0);
  const [data, setData] = useState<TechnicianDashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await getTechnicianDashboardFn({ data: weekOffset }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, [weekOffset]);

  useEffect(() => {
    void load();
  }, [load]);

  const todayLabel = new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  }).format(new Date());

  const stats = data?.stats;
  const charts = data?.charts;
  const sparklines = charts?.sparklines ?? {
    pending: EMPTY_SPARK,
    checkout: EMPTY_SPARK,
    onLoan: EMPTY_SPARK,
    pool: EMPTY_SPARK,
  };
  const programKeys = charts?.programKeys ?? [];
  const showProgramChart = programKeys.length > 0;

  const weekStart = data?.weekStart ?? localDateToIso(new Date());
  const weekEnd = data?.weekEnd ?? localDateToIso(new Date());
  const timetable = data?.timetable ?? [];

  return (
    <TechnicianShell>
      <div className="mb-5 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">Dashboard</h1>
          <p className="text-xs text-muted-foreground sm:text-sm">
            {todayLabel} · Live inventory & requests
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" className="h-8 rounded-lg" asChild>
            <Link to="/technician/requests">Requests</Link>
          </Button>
          <Button variant="outline" size="sm" className="h-8 rounded-lg" asChild>
            <Link to="/technician/request-assets">Request pool</Link>
          </Button>
          <Button variant="outline" size="sm" className="h-8 rounded-lg" asChild>
            <Link to="/technician/laptop">
              <Laptop className="mr-1.5 h-3.5 w-3.5" />
              Laptops
            </Link>
          </Button>
          <Button variant="outline" size="sm" className="h-8 rounded-lg" asChild>
            <Link to="/technician/av">
              <Tv className="mr-1.5 h-3.5 w-3.5" />
              AV
            </Link>
          </Button>
          <Button variant="outline" size="sm" className="h-8 rounded-lg" asChild>
            <Link to="/technician/network">
              <Network className="mr-1.5 h-3.5 w-3.5" />
              Network
            </Link>
          </Button>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={ClipboardList}
          label="Needs action"
          value={stats?.pendingRequests ?? 0}
          tint="bg-lavender/15 text-[oklch(0.45_0.12_290)]"
          sparkData={sparklines.pending.length ? sparklines.pending : EMPTY_SPARK}
          sparkColor={SPARK_COLORS.pending}
          href="/technician/requests"
        />
        <StatCard
          icon={PackageCheck}
          label="Ready checkout"
          value={stats?.awaitingCheckout ?? 0}
          tint="bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200"
          sparkData={sparklines.checkout.length ? sparklines.checkout : EMPTY_SPARK}
          sparkColor={SPARK_COLORS.checkout}
          href="/technician/requests"
        />
        <StatCard
          icon={CalendarDays}
          label="Out on loan"
          value={stats?.checkedOut ?? 0}
          tint="bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-200"
          sparkData={sparklines.onLoan.length ? sparklines.onLoan : EMPTY_SPARK}
          sparkColor={SPARK_COLORS.onLoan}
          href="/technician/requests"
        />
        <StatCard
          icon={Package}
          label="Request pool"
          value={stats?.requestPoolCount ?? 0}
          tint="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
          sparkData={sparklines.pool.length ? sparklines.pool : EMPTY_SPARK}
          sparkColor={SPARK_COLORS.pool}
          href="/technician/request-assets"
        />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <DashboardPanel
          title="Request activity"
          description="New submissions and returns due · last 14 days"
        >
          {loading && !charts ? (
            <div className="flex h-[260px] items-center justify-center text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading chart…
            </div>
          ) : (
            <RequestTrendChart data={charts?.requestTrend ?? []} />
          )}
        </DashboardPanel>

        <DashboardPanel
          title="Requests by program"
          description="Stacked daily counts by program type · last 7 days"
        >
          {loading && !charts ? (
            <div className="flex h-[260px] items-center justify-center text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading chart…
            </div>
          ) : showProgramChart ? (
            <ProgramStackChart
              data={charts?.requestsByProgram ?? []}
              programKeys={programKeys}
            />
          ) : (
            <div className="flex h-[260px] items-center justify-center text-sm text-muted-foreground">
              No requests by program in the last 7 days.
            </div>
          )}
        </DashboardPanel>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.35fr_1fr]">
        <RequestTimetable
          entries={timetable}
          weekStart={weekStart}
          weekEnd={weekEnd}
          loading={loading}
          weekOffset={weekOffset}
          onPrevWeek={() => setWeekOffset((w) => w - 1)}
          onNextWeek={() => setWeekOffset((w) => w + 1)}
          onThisWeek={() => setWeekOffset(0)}
        />
        <AssetDetailsPanel
          stats={stats}
          inventoryMix={charts?.inventoryMix ?? []}
          loading={loading}
        />
      </div>
    </TechnicianShell>
  );
}
