import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { ArrowLeft, Laptop, Layers, Network, Package, Recycle, Tv } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { toast } from 'sonner';
import { AdminShell } from '@/admin/admin-shell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { InsightStatCard } from '@/components/insight-stat-card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { isoToLocalDate } from '@shared/lib/date-format';
import { malaysiaTodayIso } from '@shared/lib/disposal-schema';
import { ASSET_KIND_LABEL, type AssetKind } from '@shared/lib/inventory-schema';
import type { DisposalHistoryBatch } from '@shared/lib/disposal-schema';
import { listAdminDisposalHistoryFn } from '@backend/server/assets/assets.functions';
import { cn } from '@/lib/utils';

const KIND_ORDER: AssetKind[] = ['laptop', 'av', 'network'];

const KIND_BAR: Record<AssetKind, string> = {
  laptop: 'bg-[#c9ef4a]',
  av: 'bg-[#7dd6f5]',
  network: 'bg-[#c4b4ff]',
};

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const monthChartConfig = {
  assets: { label: 'Assets', color: 'oklch(0.63 0.16 20)' },
};

function batchDateIso(batch: DisposalHistoryBatch): string | null {
  return batch.disposalDate ?? batch.submittedAt?.slice(0, 10) ?? null;
}

function formatDate(value: string | null) {
  if (!value) return '—';
  const date = isoToLocalDate(value);
  if (!date) return value;
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

function kindCounts(batch: DisposalHistoryBatch): Record<AssetKind, number> {
  const counts: Record<AssetKind, number> = { laptop: 0, av: 0, network: 0 };
  for (const asset of batch.assets) {
    counts[asset.kind] += 1;
  }
  return counts;
}

export function AdminDisposedPage() {
  const [batches, setBatches] = useState<DisposalHistoryBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(() => Number(malaysiaTodayIso().slice(0, 4)));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setBatches(await listAdminDisposalHistoryFn());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load disposal stats');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const years = useMemo(() => {
    const set = new Set<number>();
    for (const batch of batches) {
      const iso = batchDateIso(batch);
      if (!iso) continue;
      const y = Number(iso.slice(0, 4));
      if (Number.isFinite(y)) set.add(y);
    }
    const current = Number(malaysiaTodayIso().slice(0, 4));
    set.add(current);
    return [...set].sort((a, b) => b - a);
  }, [batches]);

  const yearBatches = useMemo(
    () =>
      batches.filter((batch) => {
        const iso = batchDateIso(batch);
        return iso?.startsWith(`${year}-`) ?? false;
      }),
    [batches, year],
  );

  const stats = useMemo(() => {
    const byKind: Record<AssetKind, number> = { laptop: 0, av: 0, network: 0 };
    const monthly = MONTH_LABELS.map((label, index) => ({
      month: label,
      assets: 0,
      batches: 0,
    }));

    let latestIso: string | null = null;
    for (const batch of yearBatches) {
      const iso = batchDateIso(batch);
      if (iso && (!latestIso || iso > latestIso)) latestIso = iso;
      const monthIndex = iso ? Number(iso.slice(5, 7)) - 1 : -1;
      if (monthIndex >= 0 && monthIndex < 12) {
        monthly[monthIndex].batches += 1;
        monthly[monthIndex].assets += batch.assetCount;
      }
      for (const asset of batch.assets) {
        byKind[asset.kind] += 1;
      }
    }

    const assetCount = yearBatches.reduce((sum, batch) => sum + batch.assetCount, 0);
    const batchCount = yearBatches.length;
    const avg = batchCount === 0 ? 0 : Math.round((assetCount / batchCount) * 10) / 10;

    return { byKind, monthly, latestIso, assetCount, batchCount, avg };
  }, [yearBatches]);

  const maxKind = Math.max(stats.assetCount, 1);

  return (
    <AdminShell>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Button variant="ghost" size="sm" type="button" className="-ml-2 mb-2 gap-1.5" asChild>
            <Link to="/admin/dashboard">
              <ArrowLeft className="h-4 w-4" />
              Back to dashboard
            </Link>
          </Button>
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Disposed {year}</h1>
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
            {loading
              ? 'Loading disposal figures…'
              : stats.latestIso
                ? `Last batch ${formatDate(stats.latestIso)} · calendar year`
                : 'No disposal batches in this year'}
          </p>
        </div>
        {years.length > 1 ? (
          <div className="flex flex-wrap gap-1.5">
            {years.map((y) => (
              <Button
                key={y}
                type="button"
                size="sm"
                variant={y === year ? 'default' : 'outline'}
                className="h-8 rounded-[8px] px-3"
                onClick={() => setYear(y)}
              >
                {y}
              </Button>
            ))}
          </div>
        ) : null}
      </div>

      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <InsightStatCard
          icon={Recycle}
          label={`Disposed ${year}`}
          value={stats.batchCount}
          valueSuffix={stats.batchCount === 1 ? 'total batch' : 'total batches'}
          hint={`${stats.assetCount} total assets`}
          tone="rose"
        />
        <InsightStatCard
          icon={Package}
          label="Assets"
          value={stats.assetCount}
          hint="Submitted in this year"
          tone="amber"
        />
        <InsightStatCard
          icon={Layers}
          label="Average batch"
          value={stats.avg}
          hint="Assets per batch"
          tone="violet"
        />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-3 xl:grid-cols-2">
        <Card className="rounded-[14px] border-border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Mix by kind</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {KIND_ORDER.map((kind) => {
              const count = stats.byKind[kind];
              const pct = stats.assetCount === 0 ? 0 : Math.round((count / maxKind) * 100);
              const Icon = kind === 'laptop' ? Laptop : kind === 'av' ? Tv : Network;
              return (
                <div key={kind}>
                  <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                    <span className="inline-flex min-w-0 items-center gap-2 text-foreground">
                      <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <span className="truncate">{ASSET_KIND_LABEL[kind]}</span>
                    </span>
                    <span className="shrink-0 tabular-nums text-muted-foreground">
                      {count}
                      {count > 0 && stats.assetCount > 0 ? ` · ${pct}%` : ''}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn('h-full rounded-full transition-[width]', KIND_BAR[kind])}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card className="rounded-[14px] border-border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Assets by month</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="py-16 text-center text-sm text-muted-foreground">Loading…</p>
            ) : stats.assetCount === 0 ? (
              <p className="py-16 text-center text-sm text-muted-foreground">No monthly activity yet.</p>
            ) : (
              <ChartContainer config={monthChartConfig} className="h-[220px] w-full">
                <BarChart data={stats.monthly} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="4 4" vertical={false} />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={28} />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        formatter={(value, _name, item) => {
                          const row = item?.payload as { batches?: number } | undefined;
                          return (
                            <span>
                              {value} asset{(Number(value) === 1 ? '' : 's')}
                              {row?.batches != null
                                ? ` · ${row.batches} batch${row.batches === 1 ? '' : 'es'}`
                                : ''}
                            </span>
                          );
                        }}
                      />
                    }
                  />
                  <Bar dataKey="assets" fill="var(--color-assets)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-[14px] border-border shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Batches</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="px-5">Batch</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Centre</TableHead>
                  <TableHead className="text-right">Assets</TableHead>
                  <TableHead className="px-5">Mix</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="px-5 py-16 text-center text-sm text-muted-foreground">
                      Loading…
                    </TableCell>
                  </TableRow>
                ) : yearBatches.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="px-5 py-16 text-center text-sm text-muted-foreground">
                      No disposal batches recorded for {year}.
                    </TableCell>
                  </TableRow>
                ) : (
                  yearBatches.map((batch) => {
                    const mix = kindCounts(batch);
                    return (
                      <TableRow key={batch.batch}>
                        <TableCell className="whitespace-nowrap px-5 font-mono text-sm font-semibold">
                          {batch.batch}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm">
                          {formatDate(batchDateIso(batch))}
                        </TableCell>
                        <TableCell className="whitespace-nowrap font-mono text-xs text-muted-foreground">
                          {batch.noRujukanPelupusan || '—'}
                        </TableCell>
                        <TableCell className="max-w-[12rem] truncate text-sm">{batch.pusat || '—'}</TableCell>
                        <TableCell className="text-right tabular-nums">{batch.assetCount}</TableCell>
                        <TableCell className="px-5 text-xs text-muted-foreground">
                          {KIND_ORDER.filter((kind) => mix[kind] > 0)
                            .map((kind) => `${mix[kind]} ${ASSET_KIND_LABEL[kind]}`)
                            .join(' · ') || '—'}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </AdminShell>
  );
}
