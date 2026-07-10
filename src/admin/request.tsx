import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, ClipboardList, Laptop, Loader2, Network, Tv, Users } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { toast } from 'sonner';
import { AdminShell } from '@/admin/admin-shell';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  DASHBOARD_REQUEST_WORKFLOW_KEYS,
  DASHBOARD_REQUEST_WORKFLOW_LABEL,
  type DashboardRequestStats,
} from '@/lib/dashboard-schema';
import type { AdminRequestInsights } from '@/lib/admin-request-insights-schema';
import { ASSET_KIND_LABEL } from '@/lib/inventory-schema';
import { formatDateLabel } from '@/lib/date-format';
import { getTechnicianDashboardFn } from '@/server/dashboard.functions';
import { getAdminRequestInsightsFn } from '@/server/admin-request-insights.functions';
import { currentCalendarMonth } from '@/dashboard/dashboard-widgets';

const EMPTY_REQUEST_STATS: DashboardRequestStats = {
  total: 0,
  byWorkflow: DASHBOARD_REQUEST_WORKFLOW_KEYS.map((key) => ({ key, count: 0 })),
  poolByKind: [],
};

const EMPTY_INSIGHTS: AdminRequestInsights = {
  monthLabel: '',
  topRequesters: [],
  programTypes: [],
  recentRequests: [],
};

function RequestWorkflowSummary({ stats }: { stats: DashboardRequestStats }) {
  const countByKey = new Map(stats.byWorkflow.map((item) => [item.key, item.count]));

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="flex items-center justify-between gap-3 bg-lavender/10 px-4 py-3 dark:bg-lavender/5">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-foreground/70">Open requests</p>
          <p className="text-3xl font-bold tabular-nums leading-none text-foreground">{stats.total}</p>
        </div>
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-lavender/15 text-[oklch(0.45_0.12_290)]">
          <ClipboardList className="h-5 w-5" />
        </div>
      </div>
      <ul className="space-y-1.5 border-t border-border/60 px-4 py-3">
        {DASHBOARD_REQUEST_WORKFLOW_KEYS.map((key) => (
          <li
            key={key}
            className="flex items-center justify-between gap-3 text-xs text-muted-foreground"
          >
            <span className="min-w-0 truncate">{DASHBOARD_REQUEST_WORKFLOW_LABEL[key]}</span>
            <span className="shrink-0 tabular-nums font-semibold text-foreground">
              {countByKey.get(key) ?? 0}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function RequestPoolSummary({ stats }: { stats: DashboardRequestStats }) {
  const countByKind = new Map(stats.poolByKind.map((item) => [item.kind, item.count]));
  const kinds = ['laptop', 'av', 'network'] as const;
  const icons = { laptop: Laptop, av: Tv, network: Network };

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="border-b border-border/60 px-4 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Assets in pool</p>
      </div>
      <ul className="divide-y divide-border/60">
        {kinds.map((kind) => {
          const Icon = icons[kind];
          return (
            <li key={kind} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="flex min-w-0 items-center gap-2.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted/60">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <span className="truncate text-sm text-foreground">{ASSET_KIND_LABEL[kind]}</span>
              </div>
              <span className="shrink-0 text-lg font-bold tabular-nums">{countByKind.get(kind) ?? 0}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function TopRequestersSection({
  rows,
  loading,
}: {
  rows: AdminRequestInsights['topRequesters'];
  loading: boolean;
}) {
  const maxCount = rows[0]?.requestCount ?? 0;

  return (
    <Card className="rounded-2xl border-border shadow-sm">
      <CardContent className="p-4 sm:p-5">
        <div className="mb-4 flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <div>
            <h2 className="text-base font-semibold text-foreground">Top requester</h2>
            <p className="text-xs text-muted-foreground">This month</p>
          </div>
        </div>
        {loading ? (
          <LoadingState />
        ) : rows.length === 0 ? (
          <EmptyState message="No requesters this month." />
        ) : (
          <ul className="space-y-3">
            {rows.map((row, index) => {
              const width = maxCount > 0 ? Math.max(8, (row.requestCount / maxCount) * 100) : 0;
              return (
                <li key={row.staffId}>
                  <div className="mb-1.5 flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-lavender/15 text-[11px] font-bold tabular-nums text-[oklch(0.45_0.12_290)]">
                        {index + 1}
                      </span>
                      <span className="truncate text-sm font-medium text-foreground">{row.fullName}</span>
                    </div>
                    <span className="shrink-0 text-sm font-bold tabular-nums text-foreground">
                      {row.requestCount}
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-[oklch(0.55_0.14_290)]"
                      style={{ width: `${width}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function ProgramTypeSection({
  rows,
  monthLabel,
  loading,
}: {
  rows: AdminRequestInsights['programTypes'];
  monthLabel: string;
  loading: boolean;
}) {
  const maxCount = rows[0]?.count ?? 0;

  return (
    <Card className="rounded-2xl border-border shadow-sm">
      <CardContent className="p-4 sm:p-5">
        <div className="mb-4">
          <h2 className="text-base font-semibold text-foreground">Total program type</h2>
          <p className="text-xs text-muted-foreground">{monthLabel || 'This month'}</p>
        </div>
        {loading ? (
          <LoadingState />
        ) : rows.length === 0 ? (
          <EmptyState message="No requests this month." />
        ) : (
          <ul className="space-y-3">
            {rows.map((row) => {
              const width = maxCount > 0 ? Math.max(8, (row.count / maxCount) * 100) : 0;
              return (
                <li key={row.programType}>
                  <div className="mb-1.5 flex items-center justify-between gap-3">
                    <span className="min-w-0 truncate text-sm font-medium text-foreground">
                      {row.programType}
                    </span>
                    <span className="shrink-0 text-sm font-bold tabular-nums text-foreground">{row.count}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-sky-500"
                      style={{ width: `${width}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function RecentRequestsSection({
  rows,
  loading,
}: {
  rows: AdminRequestInsights['recentRequests'];
  loading: boolean;
}) {
  return (
    <Card className="rounded-2xl border-border shadow-sm lg:col-span-2">
      <CardContent className="p-4 sm:p-5">
        <div className="mb-4">
          <h2 className="text-base font-semibold text-foreground">Recent request</h2>
          <p className="text-xs text-muted-foreground">Latest 5 submissions</p>
        </div>
        {loading ? (
          <LoadingState />
        ) : rows.length === 0 ? (
          <EmptyState message="No recent requests." />
        ) : (
          <ul className="space-y-3">
            {rows.map((row) => (
              <li
                key={row.requestId}
                className="rounded-xl border border-border/70 bg-muted/20 px-3 py-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">{row.requesterName}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{row.programType}</p>
                  </div>
                  <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                    #{row.requestId}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
                  <span>
                    {formatDateLabel(row.borrowDate)} → {formatDateLabel(row.returnDate)}
                  </span>
                  <span>·</span>
                  <span>{row.createdAt}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function LoadingState() {
  return (
    <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" />
      Loading…
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return <p className="py-10 text-center text-sm text-muted-foreground">{message}</p>;
}

export function AdminRequestPage() {
  const [stats, setStats] = useState<DashboardRequestStats>(EMPTY_REQUEST_STATS);
  const [insights, setInsights] = useState<AdminRequestInsights>(EMPTY_INSIGHTS);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [dashboard, requestInsights] = await Promise.all([
        getTechnicianDashboardFn({ data: currentCalendarMonth() }),
        getAdminRequestInsightsFn(),
      ]);
      setStats(dashboard.stats.totalRequest);
      setInsights(requestInsights);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load requests');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <AdminShell>
      <div className="mb-5 flex flex-col gap-4 sm:mb-6">
        <div>
          <Button variant="ghost" size="sm" className="-ml-2 mb-2 h-8 rounded-lg px-2 text-muted-foreground" asChild>
            <Link to="/admin/dashboard">
              <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
              Dashboard
            </Link>
          </Button>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-lavender/15 text-[oklch(0.45_0.12_290)]">
              <ClipboardList className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">Equipment requests</h1>
              <p className="text-xs text-muted-foreground sm:text-sm">Open requests overview · read-only</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <RequestWorkflowSummary stats={stats} />
          <RequestPoolSummary stats={stats} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <TopRequestersSection rows={insights.topRequesters} loading={loading} />
        <ProgramTypeSection
          rows={insights.programTypes}
          monthLabel={insights.monthLabel}
          loading={loading}
        />
        <RecentRequestsSection rows={insights.recentRequests} loading={loading} />
      </div>
    </AdminShell>
  );
}
