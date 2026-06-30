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
  description,
  value,
  tint,
  sparkData,
  sparkColor,
  href,
}: {
  icon: ElementType;
  label: string;
  description: string;
  value: number;
  tint: string;
  sparkData: number[];
  sparkColor: string;
  href?: string;
}) {
  const inner = (
    <div className="flex items-start justify-between gap-3 rounded-2xl border border-border bg-card p-4 transition-shadow hover:shadow-sm">
      <div className="flex min-w-0 items-start gap-3">
        <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px]', tint)}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold tabular-nums text-foreground">{value}</p>
          <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">{description}</p>
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

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

type CalendarCell = { iso: string; day: number; inMonth: boolean };

function currentCalendarMonth(): { year: number; month: number } {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

function monthLabel(year: number, month: number): string {
  return new Date(year, month - 1, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

function buildMonthCells(year: number, month: number): CalendarCell[] {
  const cells: CalendarCell[] = [];
  const first = new Date(year, month - 1, 1);
  const pad = (first.getDay() + 6) % 7;
  const prevMonthEnd = new Date(year, month - 1, 0);

  for (let i = pad - 1; i >= 0; i--) {
    const d = new Date(prevMonthEnd);
    d.setDate(prevMonthEnd.getDate() - i);
    cells.push({ iso: localDateToIso(d), day: d.getDate(), inMonth: false });
  }

  const daysInMonth = new Date(year, month, 0).getDate();
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push({
      iso: localDateToIso(new Date(year, month - 1, day)),
      day,
      inMonth: true,
    });
  }

  let nextDay = 1;
  while (cells.length % 7 !== 0) {
    const d = new Date(year, month, nextDay++);
    cells.push({ iso: localDateToIso(d), day: d.getDate(), inMonth: false });
  }

  return cells;
}

function entryCoversDay(entry: DashboardTimetableEntry, iso: string): boolean {
  return iso >= entry.borrowDate && iso <= entry.returnDate;
}

function entriesOnDay(entries: DashboardTimetableEntry[], iso: string): DashboardTimetableEntry[] {
  return entries.filter((e) => entryCoversDay(e, iso));
}

function RequestDetailPanel({ entry }: { entry: DashboardTimetableEntry | null }) {
  if (!entry) {
    return (
      <div className="border-t border-border bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground sm:px-6">
        Select a request on the calendar to view details.
      </div>
    );
  }

  return (
    <div className="border-t border-border bg-muted/20 px-4 py-4 sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="text-sm font-semibold text-foreground">{entry.requesterName}</p>
          <p className="font-mono text-xs text-muted-foreground">Request #{entry.requestId}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className={cn('rounded-md text-xs', STATUS_BADGE[entry.status])}>
            {DASHBOARD_REQUEST_STATUS_LABEL[entry.status]}
          </Badge>
          {entry.needsAction && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 dark:text-amber-400">
              <AlertCircle className="h-3.5 w-3.5" />
              Action needed
            </span>
          )}
        </div>
      </div>

      <dl className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Program</dt>
          <dd className="mt-0.5 font-medium text-foreground">{entry.programType}</dd>
        </div>
        <div>
          <dt className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Location</dt>
          <dd className="mt-0.5 font-medium text-foreground">{entry.usageLocation}</dd>
        </div>
        <div>
          <dt className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Borrow window</dt>
          <dd className="mt-0.5 font-medium text-foreground">
            {formatDateLabel(entry.borrowDate)} → {formatDateLabel(entry.returnDate)}
          </dd>
        </div>
        <div>
          <dt className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Items requested</dt>
          <dd className="mt-0.5 font-medium text-foreground">{entry.itemSummary}</dd>
        </div>
        <div>
          <dt className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Total quantity</dt>
          <dd className="mt-0.5 font-medium tabular-nums text-foreground">{entry.totalQty}</dd>
        </div>
      </dl>

      <Button variant="outline" size="sm" className="mt-4 h-8 rounded-lg" asChild>
        <Link to="/technician/requests">Open request</Link>
      </Button>
    </div>
  );
}

function MonthNav({
  isCurrentMonth,
  onPrev,
  onNext,
  onThisMonth,
}: {
  isCurrentMonth: boolean;
  onPrev: () => void;
  onNext: () => void;
  onThisMonth: () => void;
}) {
  return (
    <div className="flex items-center gap-1">
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-8 w-8 rounded-lg"
        onClick={onPrev}
        aria-label="Previous month"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-8 rounded-lg px-2.5 text-xs"
        disabled={isCurrentMonth}
        onClick={onThisMonth}
      >
        This month
      </Button>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-8 w-8 rounded-lg"
        onClick={onNext}
        aria-label="Next month"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}

function RequestDayList({
  dayIso,
  entries,
  selectedId,
  onSelect,
}: {
  dayIso: string;
  entries: DashboardTimetableEntry[];
  selectedId: number | null;
  onSelect: (id: number) => void;
}) {
  if (entries.length === 0) {
    return (
      <div className="border-t border-border bg-muted/20 px-4 py-6 text-center text-sm text-muted-foreground sm:px-6">
        No requests on {formatDateLabel(dayIso)}.
      </div>
    );
  }

  return (
    <div className="border-t border-border bg-muted/20 px-4 py-3 sm:px-6">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Requests on {formatDateLabel(dayIso)}
      </p>
      <div className="flex flex-wrap gap-2">
        {entries.map((entry) => (
          <button
            key={entry.requestId}
            type="button"
            onClick={() => onSelect(entry.requestId)}
            className={cn(
              'inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-left text-xs transition-colors',
              selectedId === entry.requestId
                ? 'border-[oklch(0.55_0.14_290)] bg-lavender/15'
                : 'border-border bg-card hover:bg-secondary/60',
            )}
          >
            <span
              className={cn('h-2 w-2 shrink-0 rounded-full', STATUS_BAR[entry.status])}
              aria-hidden
            />
            <span className="font-semibold text-foreground">#{entry.requestId}</span>
            <span className="max-w-[10rem] truncate text-muted-foreground">{entry.requesterName}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function RequestTimetable({
  entries,
  viewMonth,
  loading,
  isCurrentMonth,
  onPrevMonth,
  onNextMonth,
  onThisMonth,
}: {
  entries: DashboardTimetableEntry[];
  viewMonth: { year: number; month: number };
  loading: boolean;
  isCurrentMonth: boolean;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onThisMonth: () => void;
}) {
  const todayIso = localDateToIso(new Date());
  const cells = useMemo(
    () => buildMonthCells(viewMonth.year, viewMonth.month),
    [viewMonth.year, viewMonth.month],
  );
  const [selectedDayIso, setSelectedDayIso] = useState(todayIso);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  useEffect(() => {
    const inMonth = cells.some((c) => c.inMonth && c.iso === selectedDayIso);
    if (!inMonth) {
      const fallback =
        cells.find((c) => c.inMonth && c.iso === todayIso)?.iso ??
        cells.find((c) => c.inMonth)?.iso ??
        todayIso;
      setSelectedDayIso(fallback);
    }
  }, [cells, selectedDayIso, todayIso]);

  const dayRequests = useMemo(
    () => entriesOnDay(entries, selectedDayIso),
    [entries, selectedDayIso],
  );

  useEffect(() => {
    if (dayRequests.length === 0) {
      setSelectedId(null);
      return;
    }
    if (selectedId == null || !dayRequests.some((e) => e.requestId === selectedId)) {
      setSelectedId(dayRequests[0].requestId);
    }
  }, [dayRequests, selectedId]);

  const selected = dayRequests.find((e) => e.requestId === selectedId) ?? null;

  return (
    <DashboardPanel
      title="Request timetable"
      description={monthLabel(viewMonth.year, viewMonth.month)}
      headerExtra={
        <MonthNav
          isCurrentMonth={isCurrentMonth}
          onPrev={onPrevMonth}
          onNext={onNextMonth}
          onThisMonth={onThisMonth}
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

        <div className="p-4 sm:p-6">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading calendar…
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-border">
              <div className="grid grid-cols-7 border-b border-border bg-muted/30">
                {WEEKDAY_LABELS.map((label) => (
                  <div
                    key={label}
                    className="border-r border-border px-2 py-2.5 text-center text-xs font-medium text-muted-foreground last:border-r-0"
                  >
                    {label}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7">
                {cells.map((cell) => {
                  const isSelected = cell.iso === selectedDayIso;
                  const isToday = cell.iso === todayIso;
                  const dayEntries = entriesOnDay(entries, cell.iso);
                  const hasRequests = dayEntries.length > 0;

                  return (
                    <button
                      key={cell.iso}
                      type="button"
                      onClick={() => setSelectedDayIso(cell.iso)}
                      className={cn(
                        'relative min-h-[4.5rem] border-b border-r border-border p-2 text-left transition-colors last:border-r-0',
                        'hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
                        isSelected && 'bg-rose-50/80 dark:bg-rose-950/25',
                        !isSelected && isToday && 'bg-lavender/[0.06]',
                      )}
                    >
                      <span
                        className={cn(
                          'inline-flex h-7 min-w-7 items-center justify-center rounded-full text-sm font-medium tabular-nums',
                          isSelected
                            ? 'bg-orange-500 text-white shadow-sm'
                            : cell.inMonth
                              ? 'text-foreground'
                              : 'text-muted-foreground/50',
                        )}
                      >
                        {cell.day}
                      </span>
                      {hasRequests && (
                        <div className="absolute bottom-2 left-2 right-2 flex flex-wrap gap-1">
                          {dayEntries.slice(0, 3).map((entry) => (
                            <span
                              key={entry.requestId}
                              className={cn('h-1.5 w-1.5 rounded-full', STATUS_BAR[entry.status])}
                              title={`#${entry.requestId} ${entry.requesterName}`}
                            />
                          ))}
                          {dayEntries.length > 3 && (
                            <span className="text-[9px] text-muted-foreground">+{dayEntries.length - 3}</span>
                          )}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <RequestDayList
          dayIso={selectedDayIso}
          entries={dayRequests}
          selectedId={selectedId}
          onSelect={setSelectedId}
        />
        <RequestDetailPanel entry={selected} />
      </div>
    </DashboardPanel>
  );
}

const INVENTORY_BUCKET_META: Record<
  keyof Omit<DashboardInventorySlice, 'kind'>,
  { label: string; description: string }
> = {
  active: { label: 'In stock', description: 'On-site or reserved' },
  deploy: { label: 'Deployed', description: 'With staff or at a place' },
  requestFlow: { label: 'Request flow', description: 'In an active request' },
  maintenance: { label: 'Disposed / other', description: 'Disposed or unavailable' },
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
      description: 'All registered laptops & desktops',
      count: stats?.laptopCount ?? 0,
      href: '/technician/laptop' as const,
      icon: Laptop,
    },
    {
      label: 'AV',
      description: 'All registered AV equipment',
      count: stats?.avCount ?? 0,
      href: '/technician/av' as const,
      icon: Tv,
    },
    {
      label: 'Network',
      description: 'All registered network gear',
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
            {kindLinks.map(({ label, description, count, href, icon: Icon }) => (
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
                <p className="mt-0.5 text-[10px] leading-snug text-muted-foreground">{description}</p>
              </Link>
            ))}
          </div>

          <InventoryMixChart data={inventoryMix} />

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {(Object.keys(INVENTORY_BUCKET_META) as (keyof typeof INVENTORY_BUCKET_META)[]).map(
              (key) => (
                <div
                  key={key}
                  className="rounded-lg border border-border/70 bg-card px-3 py-2 text-center"
                >
                  <p className="text-[10px] text-muted-foreground">{INVENTORY_BUCKET_META[key].label}</p>
                  <p className="text-lg font-bold tabular-nums">{totals[key]}</p>
                  <p className="mt-0.5 text-[10px] leading-snug text-muted-foreground">
                    {INVENTORY_BUCKET_META[key].description}
                  </p>
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
  const [viewMonth, setViewMonth] = useState(currentCalendarMonth);
  const [data, setData] = useState<TechnicianDashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const current = currentCalendarMonth();
  const isCurrentMonth = viewMonth.year === current.year && viewMonth.month === current.month;

  const shiftMonth = (delta: number) => {
    setViewMonth((prev) => {
      const d = new Date(prev.year, prev.month - 1 + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() + 1 };
    });
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await getTechnicianDashboardFn({ data: viewMonth }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, [viewMonth]);

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
  const timetable = data?.timetable ?? [];

  return (
    <TechnicianShell>
      <div className="mb-5 sm:mb-6">
        <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">Dashboard</h1>
        <p className="text-xs text-muted-foreground sm:text-sm">
          {todayLabel} · Live inventory & requests
        </p>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={ClipboardList}
          label="Needs action"
          description="Requests require attention"
          value={stats?.pendingRequests ?? 0}
          tint="bg-lavender/15 text-[oklch(0.45_0.12_290)]"
          sparkData={sparklines.pending.length ? sparklines.pending : EMPTY_SPARK}
          sparkColor={SPARK_COLORS.pending}
          href="/technician/requests"
        />
        <StatCard
          icon={PackageCheck}
          label="Ready checkout"
          description="Requests ready for checkout"
          value={stats?.awaitingCheckout ?? 0}
          tint="bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200"
          sparkData={sparklines.checkout.length ? sparklines.checkout : EMPTY_SPARK}
          sparkColor={SPARK_COLORS.checkout}
          href="/technician/requests"
        />
        <StatCard
          icon={CalendarDays}
          label="Out on loan"
          description="Requests currently on loan"
          value={stats?.checkedOut ?? 0}
          tint="bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-200"
          sparkData={sparklines.onLoan.length ? sparklines.onLoan : EMPTY_SPARK}
          sparkColor={SPARK_COLORS.onLoan}
          href="/technician/requests"
        />
        <StatCard
          icon={Package}
          label="Request pool"
          description="Assets available for requests"
          value={stats?.requestPoolCount ?? 0}
          tint="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
          sparkData={sparklines.pool.length ? sparklines.pool : EMPTY_SPARK}
          sparkColor={SPARK_COLORS.pool}
          href="/technician/request-assets"
        />
      </div>

      <div className="mb-6">
        <RequestTimetable
          entries={timetable}
          viewMonth={viewMonth}
          loading={loading}
          isCurrentMonth={isCurrentMonth}
          onPrevMonth={() => shiftMonth(-1)}
          onNextMonth={() => shiftMonth(1)}
          onThisMonth={() => setViewMonth(currentCalendarMonth())}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
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

        <AssetDetailsPanel
          stats={stats}
          inventoryMix={charts?.inventoryMix ?? []}
          loading={loading}
        />
      </div>
    </TechnicianShell>
  );
}
