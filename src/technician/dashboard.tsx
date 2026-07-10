import { useCallback, useEffect, useState } from 'react';
import { ClipboardList, Laptop, Network, Tv } from 'lucide-react';
import { toast } from 'sonner';
import {
  DASHBOARD_REQUEST_WORKFLOW_KEYS,
  type DashboardAssetKindStats,
  type DashboardRequestStats,
  type TechnicianDashboardData,
} from '@/lib/dashboard-schema';
import { ASSET_KIND_LABEL } from '@/lib/inventory-schema';
import { getTechnicianDashboardFn } from '@/server/dashboard.functions';
import {
  InventoryStatCard,
  RequestTimetable,
  TotalRequestStatCard,
  useDashboardMonthState,
} from '@/dashboard/dashboard-widgets';
import { TechnicianShell } from '@/technician/technician-shell';

const EMPTY_ASSET_STATS: DashboardAssetKindStats = {
  store: 0,
  deploy: 0,
  total: 0,
  registeredTotal: 0,
  byStatus: [],
};

const EMPTY_REQUEST_STATS: DashboardRequestStats = {
  total: 0,
  byWorkflow: DASHBOARD_REQUEST_WORKFLOW_KEYS.map((key) => ({ key, count: 0 })),
  poolByKind: [],
};

export function TechnicianDashboardPage() {
  const { viewMonth, isCurrentMonth, shiftMonth, goToThisMonth } = useDashboardMonthState();
  const [data, setData] = useState<TechnicianDashboardData | null>(null);
  const [loading, setLoading] = useState(true);

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
        <InventoryStatCard
          icon={Laptop}
          label={ASSET_KIND_LABEL.laptop}
          stats={stats?.laptop ?? EMPTY_ASSET_STATS}
          tint="bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200"
          href="/technician/laptop"
        />
        <InventoryStatCard
          icon={Tv}
          label={ASSET_KIND_LABEL.av}
          stats={stats?.av ?? EMPTY_ASSET_STATS}
          tint="bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-200"
          href="/technician/av"
        />
        <InventoryStatCard
          icon={Network}
          label={ASSET_KIND_LABEL.network}
          stats={stats?.network ?? EMPTY_ASSET_STATS}
          tint="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
          href="/technician/network"
        />
        <TotalRequestStatCard stats={stats?.totalRequest ?? EMPTY_REQUEST_STATS} href="/technician/requests" />
      </div>

      <div className="mb-6">
        <RequestTimetable
          entries={timetable}
          viewMonth={viewMonth}
          loading={loading}
          isCurrentMonth={isCurrentMonth}
          onPrevMonth={() => shiftMonth(-1)}
          onNextMonth={() => shiftMonth(1)}
          onThisMonth={() => goToThisMonth()}
          requestHref="/technician/requests"
        />
      </div>
      <br />
      <div className="text-right text-[11px] text-muted-foreground">
        <span className="font-medium">Created for Information Technology Department UniKL RCMP</span>
      </div>
    </TechnicianShell>
  );
}
