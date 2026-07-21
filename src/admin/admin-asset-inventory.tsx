import { useCallback, useEffect, useMemo, useState, type ElementType } from 'react';
import { ArrowLeft, Building2, GraduationCap, Laptop as LaptopIcon, Layers, Loader2, Monitor, Package, Briefcase, Search, Truck, Users } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { toast } from 'sonner';
import { AdminShell } from '@/admin/admin-shell';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAssets } from '@/hooks/assets';
import { isDesktopCategory, isNotebookCategory } from '@/hooks/assetid-generator';
import {
  DASHBOARD_ASSET_DEPLOY_STATUS_IDS,
  DASHBOARD_ASSET_STORE_STATUS_IDS,
} from '@/lib/dashboard-schema';
import {
  ASSET_KIND_LABEL,
  formatStatusLabel,
  type AvAsset,
  type LaptopAsset,
  type NetworkAsset,
} from '@/lib/inventory-schema';
import { ACTIVITY_CATEGORY_LABEL, type ActivityLogEntry } from '@/lib/activity-log-schema';
import type {
  LaptopDepartmentHandover,
  LaptopDepartmentStaffHandover,
} from '@/lib/admin-laptop-insights-schema';
import { STAFF_DIVISIONS, type StaffDivision } from '@/lib/staff-schema';
import { getLaptopDepartmentHandoversFn } from '@/server/admin-laptop-insights.functions';
import { listActivityLogFn } from '@/server/activity-log.functions';
import { cn } from '@/lib/utils';

const DASHBOARD_STATUS_IDS = [1, 2, 3, 4, 5] as const;

type HandoverInsightFilter = {
  division: StaffDivision;
  formFactor: 'laptop' | 'desktop';
};

function isSameHandoverFilter(a: HandoverInsightFilter | null, b: HandoverInsightFilter | null) {
  if (!a || !b) return false;
  return a.division === b.division && a.formFactor === b.formFactor;
}

function getHandoverAssetIds(
  items: LaptopAsset[],
  filter: HandoverInsightFilter,
): Set<number> {
  return new Set(
    items
      .filter((item) => {
        if (item.recipientDivision !== filter.division) return false;
        return filter.formFactor === 'laptop'
          ? isNotebookCategory(item.category)
          : isDesktopCategory(item.category);
      })
      .map((item) => item.assetId),
  );
}

function filterDepartmentsByAssetIds(
  departments: LaptopDepartmentHandover[],
  assetIds: Set<number>,
): LaptopDepartmentHandover[] {
  return departments
    .map((department) => ({
      department: department.department,
      staff: department.staff
        .map((member) => ({
          ...member,
          assetIds: member.assetIds.filter((assetId) => assetIds.has(assetId)),
        }))
        .filter((member) => member.assetIds.length > 0),
    }))
    .filter((department) => department.staff.length > 0);
}

type PlaceAsset = AvAsset | NetworkAsset;

function AssetBucketSummaryCard({
  icon: Icon,
  label,
  items,
  statusIds,
  accent,
  iconTint,
}: {
  icon: ElementType;
  label: string;
  items: { statusId: number }[];
  statusIds: readonly number[];
  accent: string;
  iconTint: string;
}) {
  const bucketItems = useMemo(
    () => items.filter((item) => statusIds.includes(item.statusId)),
    [items, statusIds],
  );

  const statusCounts = useMemo(() => {
    const map = new Map<number, number>();
    for (const item of bucketItems) {
      map.set(item.statusId, (map.get(item.statusId) ?? 0) + 1);
    }
    return statusIds.map((statusId) => ({
      statusId,
      count: map.get(statusId) ?? 0,
    }));
  }, [bucketItems, statusIds]);

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className={cn('flex items-center justify-between gap-3 px-4 py-3', accent)}>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-foreground/70">{label}</p>
          <p className="text-3xl font-bold tabular-nums leading-none text-foreground">{bucketItems.length}</p>
        </div>
        <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-full', iconTint)}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <ul className="space-y-1.5 border-t border-border/60 px-4 py-3">
        {statusCounts.map(({ statusId, count }) => (
          <li
            key={statusId}
            className="flex items-center justify-between gap-3 text-xs text-muted-foreground"
          >
            <span className="min-w-0 truncate capitalize">{formatStatusLabel(statusId)}</span>
            <span className="shrink-0 tabular-nums font-semibold text-foreground">{count}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function AssetStockDeploySummary({ items }: { items: { statusId: number }[] }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <AssetBucketSummaryCard
        icon={Package}
        label="Store"
        items={items}
        statusIds={DASHBOARD_ASSET_STORE_STATUS_IDS}
        accent="bg-emerald-50 dark:bg-emerald-950/40"
        iconTint="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
      />
      <AssetBucketSummaryCard
        icon={Truck}
        label="Deploy"
        items={items}
        statusIds={DASHBOARD_ASSET_DEPLOY_STATUS_IDS}
        accent="bg-sky-50 dark:bg-sky-950/40"
        iconTint="bg-sky-500/15 text-sky-700 dark:text-sky-300"
      />
    </div>
  );
}

function LaptopFormFactorSummary({ items }: { items: LaptopAsset[] }) {
  const laptopItems = useMemo(
    () => items.filter((item) => isNotebookCategory(item.category)),
    [items],
  );
  const desktopItems = useMemo(
    () => items.filter((item) => isDesktopCategory(item.category)),
    [items],
  );

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <FormFactorSummaryCard
        icon={LaptopIcon}
        label="Laptop"
        items={laptopItems}
        accent="bg-sky-50 dark:bg-sky-950/40"
        iconTint="bg-sky-500/15 text-sky-700 dark:text-sky-300"
      />
      <FormFactorSummaryCard
        icon={Monitor}
        label="Desktop"
        items={desktopItems}
        accent="bg-violet-50 dark:bg-violet-950/40"
        iconTint="bg-violet-500/15 text-violet-700 dark:text-violet-300"
      />
    </div>
  );
}

function FormFactorSummaryCard({
  icon: Icon,
  label,
  items,
  accent,
  iconTint,
}: {
  icon: ElementType;
  label: string;
  items: LaptopAsset[];
  accent: string;
  iconTint: string;
}) {
  const statusCounts = useMemo(() => {
    const map = new Map<number, number>();
    for (const item of items) {
      map.set(item.statusId, (map.get(item.statusId) ?? 0) + 1);
    }
    return DASHBOARD_STATUS_IDS.map((statusId) => ({
      statusId,
      count: map.get(statusId) ?? 0,
    }));
  }, [items]);

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className={cn('flex items-center justify-between gap-3 px-4 py-3', accent)}>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-foreground/70">{label}</p>
          <p className="text-3xl font-bold tabular-nums leading-none text-foreground">{items.length}</p>
        </div>
        <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-full', iconTint)}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <ul className="space-y-1.5 border-t border-border/60 px-4 py-3">
        {statusCounts.map(({ statusId, count }) => (
          <li
            key={statusId}
            className="flex items-center justify-between gap-3 text-xs text-muted-foreground"
          >
            <span className="min-w-0 truncate capitalize">{formatStatusLabel(statusId)}</span>
            <span className="shrink-0 tabular-nums font-semibold text-foreground">{count}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function InsightsLoading() {
  return (
    <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" />
      Loading…
    </div>
  );
}

function InsightsEmpty({ message }: { message: string }) {
  return <p className="py-10 text-center text-sm text-muted-foreground">{message}</p>;
}

function formatActivityWhen(at: string): string {
  if (!at) return '—';
  const d = new Date(at);
  if (Number.isNaN(d.getTime())) return at;
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function LaptopHandoverSummary({
  items,
  selectedFilter,
  onSelectFilter,
}: {
  items: LaptopAsset[];
  selectedFilter: HandoverInsightFilter | null;
  onSelectFilter: (filter: HandoverInsightFilter | null) => void;
}) {
  const laptopItems = useMemo(
    () => items.filter((item) => isNotebookCategory(item.category)),
    [items],
  );
  const desktopItems = useMemo(
    () => items.filter((item) => isDesktopCategory(item.category)),
    [items],
  );

  const divisionCounts = useMemo(
    () =>
      STAFF_DIVISIONS.map((division) => ({
        division,
        total: items.filter((item) => item.recipientDivision === division).length,
        laptop: laptopItems.filter((item) => item.recipientDivision === division).length,
        desktop: desktopItems.filter((item) => item.recipientDivision === division).length,
      })),
    [items, laptopItems, desktopItems],
  );

  const divisionIcon = {
    Services: Briefcase,
    Academic: GraduationCap,
  } as const;

  const divisionTint = {
    Services: 'bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-200',
    Academic: 'bg-indigo-50 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-200',
  } as const;

  return (
    <Card className="rounded-2xl border-border shadow-sm">
      <CardContent className="p-4 sm:p-5">
        <div className="mb-4">
          <h2 className="text-base font-semibold text-foreground">Total handover</h2>
          <p className="text-xs text-muted-foreground">By Services or Academic</p>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {divisionCounts.map(({ division, total, laptop, desktop }) => {
            const DivisionIcon = divisionIcon[division];
            return (
              <div
                key={division}
                className="rounded-2xl border border-border bg-muted/20 px-4 py-4"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      'flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px]',
                      divisionTint[division],
                    )}
                  >
                    <DivisionIcon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {division}
                    </p>
                    <p className="text-3xl font-bold tabular-nums text-foreground">{total}</p>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 border-t border-border/60 pt-3">
                  {(['laptop', 'desktop'] as const).map((formFactor) => {
                    const count = formFactor === 'laptop' ? laptop : desktop;
                    const filter = { division, formFactor };
                    const isSelected = isSameHandoverFilter(selectedFilter, filter);
                    const label = formFactor === 'laptop' ? 'Laptop' : 'Desktop';
                    return (
                      <button
                        key={formFactor}
                        type="button"
                        onClick={() =>
                          onSelectFilter(isSelected ? null : filter)
                        }
                        className={cn(
                          'rounded-xl border px-3 py-2 text-left transition-colors',
                          isSelected
                            ? 'border-sky-300 bg-sky-50 ring-2 ring-sky-200 dark:border-sky-700 dark:bg-sky-950 dark:ring-sky-800'
                            : 'border-border/70 bg-card hover:bg-muted/40',
                        )}
                      >
                        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                          {label}
                        </p>
                        <p className="mt-0.5 text-lg font-bold tabular-nums">{count}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function countDepartmentFormFactors(
  staff: LaptopDepartmentStaffHandover[],
  assetCategoryById: Map<number, string | null>,
) {
  let laptop = 0;
  let desktop = 0;

  for (const member of staff) {
    for (const assetId of member.assetIds) {
      const category = assetCategoryById.get(assetId) ?? null;
      if (isNotebookCategory(category)) laptop += 1;
      else if (isDesktopCategory(category)) desktop += 1;
    }
  }

  return { laptop, desktop };
}

type StaffHandoverRow = LaptopDepartmentStaffHandover & {
  department: string;
};

function matchesStaffSearch(row: StaffHandoverRow, query: string) {
  return (
    row.fullName.toLowerCase().includes(query) ||
    row.employeeNo.toLowerCase().includes(query) ||
    row.department.toLowerCase().includes(query) ||
    row.assetIds.some((assetId) => String(assetId).includes(query))
  );
}

function StaffHandoverAssetBadges({ assetIds }: { assetIds: number[] }) {
  if (assetIds.length === 0) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {assetIds.map((assetId) => (
        <span
          key={assetId}
          className="rounded-md bg-muted px-2 py-0.5 font-mono text-[11px] font-medium text-foreground"
        >
          #{assetId}
        </span>
      ))}
    </div>
  );
}

function StaffHandoverTable({
  rows,
  showDepartment = false,
}: {
  rows: StaffHandoverRow[];
  showDepartment?: boolean;
}) {
  if (rows.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">No staff match your search.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent [&>th]:text-muted-foreground">
          {showDepartment ? <TableHead className="min-w-[140px] font-semibold">Department</TableHead> : null}
          <TableHead className="min-w-[180px] font-semibold">Staff</TableHead>
          <TableHead className="whitespace-nowrap font-semibold">Employee no.</TableHead>
          <TableHead className="min-w-[160px] font-semibold">Asset IDs</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={`${row.department}-${row.employeeNo}`}>
            {showDepartment ? (
              <TableCell className="align-top text-sm text-muted-foreground">{row.department}</TableCell>
            ) : null}
            <TableCell className="align-top font-medium text-foreground">
              <span className="inline-flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                {row.fullName}
              </span>
            </TableCell>
            <TableCell className="align-top">
              <code className="text-xs text-muted-foreground">{row.employeeNo}</code>
            </TableCell>
            <TableCell className="align-top">
              <StaffHandoverAssetBadges assetIds={row.assetIds} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function LaptopInsightsSections({
  items,
  filter,
  onClearFilter,
}: {
  items: LaptopAsset[];
  filter: HandoverInsightFilter | null;
  onClearFilter: () => void;
}) {
  const [departments, setDepartments] = useState<LaptopDepartmentHandover[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setDepartments(await getLaptopDepartmentHandoversFn());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load laptop insights');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setSearch('');
  }, [filter]);

  const assetCategoryById = useMemo(
    () => new Map(items.map((item) => [item.assetId, item.category])),
    [items],
  );

  const visibleDepartments = useMemo(() => {
    if (!filter) return departments;
    return filterDepartmentsByAssetIds(departments, getHandoverAssetIds(items, filter));
  }, [departments, filter, items]);

  const staffRows = useMemo<StaffHandoverRow[]>(
    () =>
      visibleDepartments.flatMap((department) =>
        department.staff.map((member) => ({
          department: department.department,
          ...member,
        })),
      ),
    [visibleDepartments],
  );

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return staffRows;
    return staffRows.filter((row) => matchesStaffSearch(row, query));
  }, [staffRows, search]);

  const filteredDepartments = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return visibleDepartments;

    const grouped = new Map<string, LaptopDepartmentStaffHandover[]>();
    for (const row of filteredRows) {
      const staff = grouped.get(row.department) ?? [];
      staff.push({
        employeeNo: row.employeeNo,
        fullName: row.fullName,
        assetIds: row.assetIds,
      });
      grouped.set(row.department, staff);
    }

    return [...grouped.entries()]
      .map(([department, staff]) => ({ department, staff }))
      .sort((a, b) => a.department.localeCompare(b.department));
  }, [visibleDepartments, filteredRows, search]);

  const isSearching = search.trim().length > 0;
  const filterLabel = filter
    ? `${filter.division} · ${filter.formFactor === 'laptop' ? 'Laptop' : 'Desktop'}`
    : null;
  const emptyMessage = filter
    ? `No handovers for ${filterLabel}.`
    : 'No department handover data yet.';

  return (
    <div className="mt-4">
      <Card className="rounded-2xl border-border shadow-sm">
        <CardContent className="p-4 sm:p-5">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-2">
              <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <div>
                <h2 className="text-base font-semibold text-foreground">Departments</h2>
                <p className="text-xs text-muted-foreground">
                  {filterLabel
                    ? `${filterLabel} handovers by department and staff`
                    : 'All laptop handovers by department and staff'}
                </p>
              </div>
            </div>
            {filter ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0 rounded-[8px]"
                onClick={onClearFilter}
              >
                Clear filter
              </Button>
            ) : null}
          </div>

          {!loading && visibleDepartments.length > 0 ? (
            <div className="relative mb-4 w-full sm:max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search staff, employee no., department, asset ID…"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="h-10 rounded-[10px] pl-9"
              />
            </div>
          ) : null}

          {loading ? (
            <InsightsLoading />
          ) : visibleDepartments.length === 0 ? (
            <InsightsEmpty message={emptyMessage} />
          ) : isSearching ? (
            <div>
              <p className="mb-3 text-xs text-muted-foreground">
                {filteredRows.length} result{filteredRows.length === 1 ? '' : 's'}
              </p>
              <ScrollArea className="h-[min(520px,60vh)] rounded-xl border border-border/70">
                <div className="overflow-x-auto p-1">
                  <StaffHandoverTable rows={filteredRows} showDepartment />
                </div>
              </ScrollArea>
            </div>
          ) : (
            <ScrollArea className="h-[min(520px,60vh)] rounded-xl border border-border/70">
              <Accordion type="multiple" className="p-2">
                {filteredDepartments.map((department) => {
                  const { laptop, desktop } = countDepartmentFormFactors(
                    department.staff,
                    assetCategoryById,
                  );
                  return (
                    <AccordionItem
                      key={department.department}
                      value={department.department}
                      className="mb-2 overflow-hidden rounded-xl border border-border/70 px-3 last:mb-0"
                    >
                      <AccordionTrigger className="py-3 hover:no-underline">
                        <div className="flex min-w-0 flex-1 items-center justify-between gap-3 pr-2 text-left">
                          <span className="truncate text-sm font-semibold text-foreground">
                            {department.department}
                          </span>
                          <span className="shrink-0 text-[11px] font-medium tabular-nums text-muted-foreground">
                            Laptop: {laptop} · Desktop: {desktop}
                          </span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pb-3">
                        <div className="overflow-x-auto rounded-lg border border-border/60">
                          <StaffHandoverTable
                            rows={department.staff.map((member) => ({
                              department: department.department,
                              ...member,
                            }))}
                          />
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function AvNetworkInsightsSections({
  kind,
  items,
}: {
  kind: 'av' | 'network';
  items: PlaceAsset[];
}) {
  const [activity, setActivity] = useState<ActivityLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const buildingCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of items) {
      const building = item.building?.trim();
      if (!building) continue;
      map.set(building, (map.get(building) ?? 0) + 1);
    }
    return [...map.entries()]
      .map(([building, count]) => ({ building, count }))
      .sort((a, b) => b.count - a.count || a.building.localeCompare(b.building));
  }, [items]);

  const totalDeployed = useMemo(
    () => buildingCounts.reduce((sum, { count }) => sum + count, 0),
    [buildingCounts],
  );

  const categoryCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of items) {
      const label = item.category?.trim() || 'Uncategorized';
      map.set(label, (map.get(label) ?? 0) + 1);
    }
    return [...map.entries()]
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count);
  }, [items]);

  const maxCategoryCount = categoryCounts[0]?.count ?? 0;

  const buildingTint: Record<string, string> = {
    'Al Razi': 'bg-violet-50 text-violet-800 dark:bg-violet-950 dark:text-violet-200',
    Avicenna: 'bg-sky-50 text-sky-800 dark:bg-sky-950 dark:text-sky-200',
    'Al Zahrawi': 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200',
  };
  const fallbackTint = 'bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-200';

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        const log = await listActivityLogFn();
        if (!cancelled) {
          setActivity(log.filter((entry) => entry.assetKind === kind).slice(0, 5));
        }
      } catch (e) {
        if (!cancelled) {
          toast.error(e instanceof Error ? e.message : 'Failed to load activity');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [kind]);

  return (
    <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Card className="rounded-2xl border-border shadow-sm">
        <CardContent className="p-4 sm:p-5">
          <div className="mb-4">
            <h2 className="text-base font-semibold text-foreground">Recent activities</h2>
            <p className="text-xs text-muted-foreground">
              Latest {kind === 'av' ? 'AV' : 'Network'} events
            </p>
          </div>
          {loading ? (
            <InsightsLoading />
          ) : activity.length === 0 ? (
            <InsightsEmpty message="No recent activity." />
          ) : (
            <ul className="space-y-3">
              {activity.map((entry) => (
                <li
                  key={entry.id}
                  className="rounded-xl border border-border/70 bg-muted/20 px-3 py-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">{entry.title}</p>
                      {entry.detail ? (
                        <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{entry.detail}</p>
                      ) : null}
                    </div>
                    <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
                      {formatActivityWhen(entry.at)}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
                    <span className="rounded-full bg-card px-2 py-0.5 font-medium capitalize ring-1 ring-border/60">
                      {ACTIVITY_CATEGORY_LABEL[entry.category]}
                    </span>
                    {entry.assetId != null ? (
                      <span className="font-mono">#{entry.assetId}</span>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-border shadow-sm">
        <CardContent className="p-4 sm:p-5">
          <div className="mb-4 flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <div className="flex flex-1 items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-foreground">Building</h2>
                <p className="text-xs text-muted-foreground">
                  Deployed {kind === 'av' ? 'AV' : 'Network'} assets by building
                </p>
              </div>
              <span className="shrink-0 rounded-full bg-muted px-2.5 py-1 text-xs font-bold tabular-nums text-foreground">
                Total: {totalDeployed}
              </span>
            </div>
          </div>
          {buildingCounts.length === 0 ? (
            <InsightsEmpty message={`No deployed ${kind === 'av' ? 'AV' : 'Network'} assets yet.`} />
          ) : (
          <div className="grid grid-cols-1 gap-3">
            {buildingCounts.map(({ building, count }) => (
              <div
                key={building}
                className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-muted/20 px-4 py-3"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div
                    className={cn(
                      'flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px]',
                      buildingTint[building] ?? fallbackTint,
                    )}
                  >
                    <Building2 className="h-4 w-4" />
                  </div>
                  <span className="truncate text-sm font-medium text-foreground">{building}</span>
                </div>
                <span className="text-xl font-bold tabular-nums text-foreground">{count}</span>
              </div>
            ))}
          </div>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-border shadow-sm lg:col-span-2">
        <CardContent className="p-4 sm:p-5">
          <div className="mb-4 flex items-center gap-2">
            <Layers className="h-4 w-4 text-muted-foreground" />
            <div>
              <h2 className="text-base font-semibold text-foreground">Total by category</h2>
              <p className="text-xs text-muted-foreground">
                {kind === 'av' ? 'AV equipment categories' : 'Network equipment categories'}
              </p>
            </div>
          </div>
          {categoryCounts.length === 0 ? (
            <InsightsEmpty message="No category data available." />
          ) : (
            <ul className="space-y-3">
              {categoryCounts.map(({ label, count }) => {
                const width =
                  maxCategoryCount > 0 ? Math.max(8, (count / maxCategoryCount) * 100) : 0;
                return (
                  <li key={label}>
                    <div className="mb-1.5 flex items-center justify-between gap-3">
                      <span className="min-w-0 truncate text-sm font-medium capitalize text-foreground">
                        {label}
                      </span>
                      <span className="shrink-0 text-sm font-bold tabular-nums text-foreground">{count}</span>
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
    </div>
  );
}

export function AdminPlaceAssetOverviewPage({
  kind,
  icon: Icon,
}: {
  kind: 'av' | 'network';
  icon: ElementType;
}) {
  const { items, error } = useAssets(kind);

  return (
    <AdminShell>
      <div className="mb-5 flex flex-col gap-4 sm:mb-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Button variant="ghost" size="sm" className="-ml-2 mb-2 h-8 rounded-lg px-2 text-muted-foreground" asChild>
              <Link to="/admin/dashboard">
                <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
                Dashboard
              </Link>
            </Button>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-lavender/15 text-[oklch(0.45_0.12_290)]">
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                  {ASSET_KIND_LABEL[kind]}
                </h1>
                <p className="text-xs text-muted-foreground sm:text-sm">
                  Inventory overview · read-only
                </p>
              </div>
            </div>
          </div>
        </div>

        <AssetStockDeploySummary items={items} />
      </div>

      {error ? <p className="mb-4 text-sm text-destructive">{error}</p> : null}

      <AvNetworkInsightsSections kind={kind} items={items as PlaceAsset[]} />
    </AdminShell>
  );
}

export function AdminAssetInventoryPage({
  kind,
  icon: Icon,
}: {
  kind: 'laptop';
  icon: ElementType;
}) {
  const { items, error } = useAssets(kind);
  const [handoverFilter, setHandoverFilter] = useState<HandoverInsightFilter | null>(null);
  const laptopItems = items as LaptopAsset[];

  return (
    <AdminShell>
      <div className="mb-5 flex flex-col gap-4 sm:mb-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Button variant="ghost" size="sm" className="-ml-2 mb-2 h-8 rounded-lg px-2 text-muted-foreground" asChild>
              <Link to="/admin/dashboard">
                <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
                Dashboard
              </Link>
            </Button>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-lavender/15 text-[oklch(0.45_0.12_290)]">
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                  {ASSET_KIND_LABEL[kind]}
                </h1>
                <p className="text-xs text-muted-foreground sm:text-sm">
                  Inventory overview · read-only
                </p>
              </div>
            </div>
          </div>
        </div>

        <LaptopFormFactorSummary items={items as LaptopAsset[]} />
      </div>

      {error ? <p className="mb-4 text-sm text-destructive">{error}</p> : null}

      <LaptopHandoverSummary
        items={laptopItems}
        selectedFilter={handoverFilter}
        onSelectFilter={setHandoverFilter}
      />
      <LaptopInsightsSections
        items={laptopItems}
        filter={handoverFilter}
        onClearFilter={() => setHandoverFilter(null)}
      />
    </AdminShell>
  );
}
