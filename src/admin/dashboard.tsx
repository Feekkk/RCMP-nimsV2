import { useCallback, useEffect, useState, type ElementType, type ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import {
  ClipboardList,
  Download,
  Laptop,
  Loader2,
  MoreVertical,
  Package,
  Truck,
  Users,
  Wrench,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { UsersByRoleChart } from '@/admin/admin-dashboard-charts';
import { AdminShell } from '@/admin/admin-shell';
import type { AdminDashboardData, AdminPeriodDays } from '@/lib/admin-dashboard-schema';
import { readAdminSession } from '@/lib/auth-session';
import { cn } from '@/lib/utils';
import { getAdminDashboardFn } from '@/server/admin-dashboard.functions';
import {
  InventoryMixChart,
  MiniSparkline,
  ProgramStackChart,
  RequestTrendChart,
} from '@/technician/dashboard-charts';

const EMPTY_SPARK = Array(7).fill(0);

const SPARK_COLORS = {
  assets: 'hsl(262 55% 58%)',
  users: 'hsl(168 45% 42%)',
  requests: 'hsl(210 70% 55%)',
  onLoan: 'hsl(239 84% 67%)',
};

const INVENTORY_BUCKET_LABEL = {
  active: 'In stock',
  deploy: 'Deployed',
  requestFlow: 'Request flow',
  maintenance: 'Disposed / other',
} as const;

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
}: {
  icon: ElementType;
  label: string;
  value: number;
  tint: string;
  sparkData: number[];
  sparkColor: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4">
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
}

const PERIOD_OPTIONS: { days: AdminPeriodDays; label: string }[] = [
  { days: 7, label: '7d' },
  { days: 30, label: '30d' },
  { days: 90, label: '90d' },
];

export function AdminDashboardPage() {
  const [periodDays, setPeriodDays] = useState<AdminPeriodDays>(30);
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const admin = readAdminSession();
    if (!admin) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      setData(
        await getAdminDashboardFn({
          data: { callerRoleId: admin.roleId, periodDays },
        }),
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, [periodDays]);

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
  const inventoryMix = charts?.inventoryMix ?? [];

  const totals = inventoryMix.reduce(
    (acc, row) => ({
      active: acc.active + row.active,
      deploy: acc.deploy + row.deploy,
      requestFlow: acc.requestFlow + row.requestFlow,
      maintenance: acc.maintenance + row.maintenance,
    }),
    { active: 0, deploy: 0, requestFlow: 0, maintenance: 0 },
  );

  const lifecycle = data?.lifecycle;

  return (
    <AdminShell>
      <div className="mb-5 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">System overview</h1>
          <p className="text-xs text-muted-foreground sm:text-sm">
            {todayLabel} · Fleet & request analytics
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg border border-border bg-muted/40 p-0.5">
            {PERIOD_OPTIONS.map(({ days, label }) => (
              <Button
                key={days}
                type="button"
                variant={periodDays === days ? 'secondary' : 'ghost'}
                size="sm"
                className="h-8 rounded-md px-3 text-xs"
                onClick={() => setPeriodDays(days)}
              >
                {label}
              </Button>
            ))}
          </div>
          <Button variant="outline" size="sm" className="h-8 rounded-lg" asChild>
            <Link to="/admin/users">Manage users</Link>
          </Button>
          <Button variant="outline" size="sm" className="h-8 rounded-lg" asChild>
            <Link to="/admin/export">
              <Download className="mr-1.5 h-3.5 w-3.5" />
              Export data
            </Link>
          </Button>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={Laptop}
          label="Total assets"
          value={stats?.totalAssets ?? 0}
          tint="bg-lavender/15 text-[oklch(0.45_0.12_290)]"
          sparkData={sparklines.pool.length ? sparklines.pool : EMPTY_SPARK}
          sparkColor={SPARK_COLORS.assets}
        />
        <StatCard
          icon={Users}
          label="Registered users"
          value={stats?.registeredUsers ?? 0}
          tint="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
          sparkData={sparklines.pending.length ? sparklines.pending : EMPTY_SPARK}
          sparkColor={SPARK_COLORS.users}
        />
        <StatCard
          icon={ClipboardList}
          label="Requests in period"
          value={stats?.requestsInPeriod ?? 0}
          tint="bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200"
          sparkData={sparklines.pending.length ? sparklines.pending : EMPTY_SPARK}
          sparkColor={SPARK_COLORS.requests}
        />
        <StatCard
          icon={Package}
          label="On loan now"
          value={stats?.onLoanNow ?? 0}
          tint="bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-200"
          sparkData={sparklines.onLoan.length ? sparklines.onLoan : EMPTY_SPARK}
          sparkColor={SPARK_COLORS.onLoan}
        />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <DashboardPanel
          title="Request activity"
          description={`New submissions and returns due · last ${periodDays} days`}
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
          description={`Stacked daily counts · last ${Math.min(periodDays, 7)} days`}
        >
          {loading && !charts ? (
            <div className="flex h-[260px] items-center justify-center text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading chart…
            </div>
          ) : showProgramChart ? (
            <ProgramStackChart data={charts?.requestsByProgram ?? []} programKeys={programKeys} />
          ) : (
            <div className="flex h-[260px] items-center justify-center text-sm text-muted-foreground">
              No requests by program in this period.
            </div>
          )}
        </DashboardPanel>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <DashboardPanel
          title="Asset inventory mix"
          description="Status breakdown across laptop, AV, and network"
        >
          {loading ? (
            <div className="flex h-[260px] items-center justify-center text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading…
            </div>
          ) : (
            <div className="space-y-4">
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
            </div>
          )}
        </DashboardPanel>

        <DashboardPanel title="Users by role" description="Account distribution across the system">
          {loading ? (
            <div className="flex h-[260px] items-center justify-center text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading…
            </div>
          ) : (
            <UsersByRoleChart data={data?.usersByRole ?? []} />
          )}
        </DashboardPanel>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <DashboardPanel title="Lifecycle snapshot" description={`Counts for the last ${periodDays} days where applicable`}>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-border/80 bg-muted/30 p-3">
              <div className="mb-1 flex items-center gap-1.5 text-muted-foreground">
                <Truck className="h-3.5 w-3.5" />
                <span className="text-[10px] font-medium uppercase tracking-wide">Deployed</span>
              </div>
              <p className="text-xl font-bold tabular-nums">{lifecycle?.deployedAssets ?? 0}</p>
            </div>
            <div className="rounded-xl border border-border/80 bg-muted/30 p-3">
              <div className="mb-1 flex items-center gap-1.5 text-muted-foreground">
                <Wrench className="h-3.5 w-3.5" />
                <span className="text-[10px] font-medium uppercase tracking-wide">Open repairs</span>
              </div>
              <p className="text-xl font-bold tabular-nums">{lifecycle?.openRepairs ?? 0}</p>
            </div>
            <div className="rounded-xl border border-border/80 bg-muted/30 p-3">
              <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Disposals</p>
              <p className="text-xl font-bold tabular-nums">{lifecycle?.disposalsInPeriod ?? 0}</p>
            </div>
            <div className="rounded-xl border border-border/80 bg-muted/30 p-3">
              <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                Warranty expiring (30d)
              </p>
              <p className="text-xl font-bold tabular-nums">{lifecycle?.warrantiesExpiringSoon ?? 0}</p>
            </div>
          </div>
        </DashboardPanel>

        <DashboardPanel
          title="Top requesters"
          description={`Most active borrowers · last ${periodDays} days`}
          className="lg:col-span-1"
        >
          <ScrollArea className="max-h-[220px]">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-xs">Name</TableHead>
                  <TableHead className="text-right text-xs">Requests</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data?.topRequesters ?? []).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={2} className="py-8 text-center text-sm text-muted-foreground">
                      No requests in this period.
                    </TableCell>
                  </TableRow>
                ) : (
                  data?.topRequesters.map((r) => (
                    <TableRow key={r.staffId}>
                      <TableCell className="text-sm font-medium">{r.fullName}</TableCell>
                      <TableCell className="text-right tabular-nums text-sm">{r.requestCount}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </DashboardPanel>

        <DashboardPanel title="Recent rejections" description="Latest declined requests" className="lg:col-span-1">
          <ScrollArea className="max-h-[220px]">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-xs">Date</TableHead>
                  <TableHead className="text-xs">Requester</TableHead>
                  <TableHead className="text-xs">Reason</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data?.recentRejections ?? []).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="py-8 text-center text-sm text-muted-foreground">
                      No rejections recorded.
                    </TableCell>
                  </TableRow>
                ) : (
                  data?.recentRejections.map((r) => (
                    <TableRow key={r.requestId}>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {r.rejectedAt}
                      </TableCell>
                      <TableCell className="text-sm">{r.requesterName}</TableCell>
                      <TableCell className="max-w-[8rem] truncate text-xs text-muted-foreground" title={r.rejectionReason}>
                        {r.rejectionReason}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </DashboardPanel>
      </div>
    </AdminShell>
  );
}
