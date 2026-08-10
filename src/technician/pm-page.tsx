import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from '@tanstack/react-router';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  ClipboardPlus,
  Laptop,
  Network,
  Search,
  Tv,
  Wrench,
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { isoToLocalDate, localDateToIso } from '@/lib/date-format';
import { ASSET_KIND_LABEL, type AssetKind } from '@/lib/inventory-schema';
import type { PmLogListRow, PmLogStatus, PmStats } from '@/lib/pm-schema';
import { cn } from '@/lib/utils';
import { usePagination } from '@/hooks/use-pagination';
import { getPmStatsFn, listPmChecklistsFn, listPmLogsFn } from '@/server/pm.functions';
import { AssetTablePagination } from '@/technician/asset-table-pagination';
import { DatePickerField } from '@/technician/deploy-return-fields';
import { TechnicianShell } from '@/technician/technician-shell';

const KIND_ICON: Record<AssetKind, typeof Laptop> = {
  laptop: Laptop,
  av: Tv,
  network: Network,
};

const EMPTY_STATS: PmStats = {
  thisMonth: 0,
  passed: 0,
  issues: 0,
  assetsCovered: 0,
};

function formatLogDate(iso: string) {
  return new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(`${iso}T12:00:00`));
}

function StatusBadge({ status }: { status: PmLogStatus }) {
  if (status === 'passed') {
    return (
      <Badge
        variant="secondary"
        className="rounded-[6px] border-transparent bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
      >
        Passed
      </Badge>
    );
  }
  if (status === 'failed') {
    return (
      <Badge
        variant="secondary"
        className="rounded-[6px] border-transparent bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200"
      >
        Failed
      </Badge>
    );
  }
  return (
    <Badge
      variant="secondary"
      className="rounded-[6px] border-transparent bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200"
    >
      Partial
    </Badge>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  tint,
}: {
  icon: typeof Wrench;
  label: string;
  value: number;
  hint: string;
  tint: string;
}) {
  return (
    <div className="flex h-full flex-col gap-3 rounded-2xl border border-border bg-card p-4 transition-shadow hover:shadow-sm">
      <div className="flex items-center gap-3">
        <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px]', tint)}>
          <Icon className="h-5 w-5" />
        </div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      </div>
      <div>
        <p className="text-3xl font-bold tabular-nums tracking-tight text-foreground">{value}</p>
        <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>
      </div>
    </div>
  );
}

export function PMpage() {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | PmLogStatus>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [rows, setRows] = useState<PmLogListRow[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [stats, setStats] = useState<PmStats>(EMPTY_STATS);
  const [loading, setLoading] = useState(true);

  const monthLabel = new Intl.DateTimeFormat(undefined, {
    month: 'long',
    year: 'numeric',
  }).format(new Date());

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
      const [logRows, checklistRows, nextStats] = await Promise.all([
        listPmLogsFn({
          data: {
            assetCategory: categoryFilter,
            status: statusFilter,
            dateFrom: dateFrom || undefined,
            dateTo: dateTo || undefined,
          },
        }),
        listPmChecklistsFn(),
        getPmStatsFn(),
      ]);
      setRows(dateRangeInvalid ? [] : logRows);
      setCategories(
        [...new Set(checklistRows.map((c) => c.assetCategory))].sort((a, b) =>
          a.localeCompare(b),
        ),
      );
      setStats(nextStats);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load maintenance log');
    } finally {
      setLoading(false);
    }
  }, [categoryFilter, statusFilter, dateFrom, dateTo, dateRangeInvalid]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      [
        r.assetLabel,
        r.serialNum,
        r.assetCategory,
        r.checklistName,
        r.performedBy,
        r.performedByEmail,
        String(r.assetId),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(q),
    );
  }, [rows, search]);

  const pagination = usePagination(filtered, {
    pageSize: 15,
    resetKey: `${search}|${categoryFilter}|${statusFilter}|${dateFrom}|${dateTo}|${filtered.length}`,
  });

  return (
    <TechnicianShell>
      <div className="mb-5 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            Preventive Maintenance
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {loading ? 'Loading…' : `${filtered.length} entr${filtered.length === 1 ? 'y' : 'ies'}`}
            {filtered.length !== rows.length && ` of ${rows.length}`}
            {' · '}
            {monthLabel}
            {dateRangeInvalid && ' · End date must be on or after start date'}
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" className="shrink-0 gap-1.5 rounded-[8px]">
              <Wrench className="h-4 w-4" />
              Actions
              <ChevronDown className="h-3.5 w-3.5 opacity-70" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem asChild>
              <Link to="/technician/pm-form">
                <Wrench className="h-4 w-4" />
                Maintenance
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/technician/pm-checklist">
                <ClipboardPlus className="h-4 w-4" />
                Add checklist
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={Wrench}
          label="This month"
          value={stats.thisMonth}
          hint="Maintenance checklists logged"
          tint="bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200"
        />
        <StatCard
          icon={CheckCircle2}
          label="Passed"
          value={stats.passed}
          hint="All checklist items OK"
          tint="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
        />
        <StatCard
          icon={AlertTriangle}
          label="Issues found"
          value={stats.issues}
          hint="Failed or partial this month"
          tint="bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200"
        />
        <StatCard
          icon={ClipboardList}
          label="Assets covered"
          value={stats.assetsCovered}
          hint="Unique assets maintained"
          tint="bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-200"
        />
      </div>

      <Card className="mb-4 rounded-[14px] border-border shadow-sm">
        <CardContent className="space-y-4 p-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:gap-3">
            <div className="min-w-0 flex-1 lg:max-w-sm">
              <Label className="mb-1.5 block text-xs text-muted-foreground">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Asset, serial, tech…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-10 rounded-[8px] pl-9"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:flex sm:shrink-0 sm:gap-3">
              <div className="w-full sm:w-[11.5rem]">
                <Label className="mb-1.5 block text-xs text-muted-foreground">Category</Label>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="h-10 rounded-[8px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All categories</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-full sm:w-[9.5rem]">
                <Label className="mb-1.5 block text-xs text-muted-foreground">Result</Label>
                <Select
                  value={statusFilter}
                  onValueChange={(v) => setStatusFilter(v as 'all' | PmLogStatus)}
                >
                  <SelectTrigger className="h-10 rounded-[8px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All results</SelectItem>
                    <SelectItem value="passed">Passed</SelectItem>
                    <SelectItem value="partial">Partial</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:gap-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="w-full sm:w-[220px]">
                <DatePickerField label="From date" value={dateFrom} onChange={setDateFrom} />
              </div>
              <div className="w-full sm:w-[220px]">
                <DatePickerField label="To date" value={dateTo} onChange={setDateTo} />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Quick range</Label>
              <div className="flex h-10 flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 rounded-[8px] px-3"
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
                  className="h-10 rounded-[8px] px-3"
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
                  className="h-10 rounded-[8px] px-3"
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
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden rounded-[14px] border-border shadow-sm">
        <CardContent className="p-0">
          {loading ? (
            <p className="py-16 text-center text-sm text-muted-foreground">Loading…</p>
          ) : pagination.paginatedItems.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-center">
              <ClipboardList className="mb-2 h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">No maintenance entries match your filters.</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="h-9 text-xs">Date</TableHead>
                    <TableHead className="h-9 text-xs">Asset</TableHead>
                    <TableHead className="hidden h-9 text-xs md:table-cell">Category</TableHead>
                    <TableHead className="hidden h-9 text-xs lg:table-cell">Technician</TableHead>
                    <TableHead className="hidden h-9 text-xs sm:table-cell">Items</TableHead>
                    <TableHead className="h-9 text-xs">Result</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagination.paginatedItems.map((row) => {
                    const Icon = KIND_ICON[row.assetType];
                    return (
                      <TableRow key={row.pmLogId}>
                        <TableCell className="whitespace-nowrap text-sm tabular-nums">
                          {formatLogDate(row.pmDate)}
                        </TableCell>
                        <TableCell>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">{row.assetLabel}</p>
                            <p className="truncate text-xs text-muted-foreground">
                              {row.serialNum ?? `#${row.assetId}`}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <span className="inline-flex items-center gap-1.5 text-sm">
                            <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                            {row.assetCategory ?? ASSET_KIND_LABEL[row.assetType]}
                          </span>
                        </TableCell>
                        <TableCell className="hidden text-sm lg:table-cell">
                          {row.performedBy}
                        </TableCell>
                        <TableCell className="hidden tabular-nums text-sm sm:table-cell">
                          {row.itemsChecked}/{row.itemsTotal}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={row.status} />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              <AssetTablePagination
                page={pagination.page}
                totalPages={pagination.totalPages}
                pageSize={pagination.pageSize}
                rangeStart={pagination.rangeStart}
                rangeEnd={pagination.rangeEnd}
                totalItems={pagination.totalItems}
                totalLoaded={filtered.length}
                onPageChange={pagination.setPage}
                onPageSizeChange={pagination.setPageSize}
              />
            </>
          )}
        </CardContent>
      </Card>
    </TechnicianShell>
  );
}
