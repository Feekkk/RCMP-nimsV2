import { useCallback, useEffect, useMemo, useState } from 'react';
import { Laptop, PackagePlus, Search, Tv } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { ActiveForRequestAsset, RequestAssignableKind } from '@/lib/request-schema';
import { usePagination } from '@/hooks/use-pagination';
import { AssetStatusBadge } from '@/technician/asset-status-badge';
import { AssetTablePagination } from '@/technician/asset-table-pagination';
import { TechnicianShell } from '@/technician/technician-shell';
import { RequestToolbarActions } from '@/technician/request-toolbar-actions';
import {
  listActiveForRequestPoolFn,
  markAssetsForRequestFn,
} from '@/server/request.functions';

function assetKey(kind: RequestAssignableKind, assetId: number) {
  return `${kind}:${assetId}`;
}

type KindFilter = 'all' | RequestAssignableKind;

export function TechnicianRequestAssetPage() {
  const [assets, setAssets] = useState<ActiveForRequestAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [kindFilter, setKindFilter] = useState<KindFilter>('all');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await listActiveForRequestPoolFn();
      setAssets(rows);
      setSelected(new Set());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load assets');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    let list = assets;
    if (kindFilter !== 'all') {
      list = list.filter((a) => a.kind === kindFilter);
    }
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter((a) =>
      [String(a.assetId), a.model, a.brand, a.category, a.serialNum, a.kind]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(q),
    );
  }, [assets, search, kindFilter]);

  const pagination = usePagination(filtered, {
    resetKey: `${search}|${kindFilter}`,
  });

  const filteredKeys = useMemo(
    () => filtered.map((a) => assetKey(a.kind, a.assetId)),
    [filtered],
  );

  const allFilteredSelected =
    filtered.length > 0 && filteredKeys.every((k) => selected.has(k));
  const someFilteredSelected = filteredKeys.some((k) => selected.has(k));

  const toggleOne = (key: string, checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(key);
      else next.delete(key);
      return next;
    });
  };

  const toggleAllFiltered = (checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) filteredKeys.forEach((k) => next.add(k));
      else filteredKeys.forEach((k) => next.delete(k));
      return next;
    });
  };

  const selectedAssets = useMemo(() => {
    return assets.filter((a) => selected.has(assetKey(a.kind, a.assetId)));
  }, [assets, selected]);

  const handleAdd = async () => {
    if (selectedAssets.length === 0) {
      toast.error('Select at least one asset');
      return;
    }
    setAdding(true);
    try {
      const result = await markAssetsForRequestFn({
        data: {
          assets: selectedAssets.map((a) => ({ kind: a.kind, assetId: a.assetId })),
        },
      });
      if (result.updated > 0) {
        toast.success(
          `Added ${result.updated} asset${result.updated === 1 ? '' : 's'} to the request pool`,
        );
      }
      if (result.errors.length > 0) {
        toast.error(`${result.errors.length} failed`, {
          description: result.errors.slice(0, 3).join(' · '),
        });
      }
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not add assets');
    } finally {
      setAdding(false);
    }
  };

  return (
    <TechnicianShell>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Add assets for request</h1>
          <p className="mt-1 max-w-xl text-xs text-muted-foreground sm:text-sm">
            Select active laptop or AV assets and add them to the request pool.
          </p>
        </div>
        <RequestToolbarActions />
      </div>

      <Card className="rounded-[14px] border-border shadow-sm">
        <CardHeader className="flex flex-col gap-3 pb-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
          <div>
            <CardTitle className="text-base">Active assets</CardTitle>
            <CardDescription>
              {filtered.length} shown · {assets.length} total
            </CardDescription>
          </div>
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 rounded-[8px] pl-9"
            />
          </div>
          <ToggleGroup
            type="single"
            value={kindFilter}
            onValueChange={(v) => {
              if (v) setKindFilter(v as KindFilter);
            }}
            className="w-full justify-start sm:w-auto"
          >
            <ToggleGroupItem value="all" className="rounded-[8px] px-3 text-xs">
              All
            </ToggleGroupItem>
            <ToggleGroupItem value="laptop" className="gap-1.5 rounded-[8px] px-3 text-xs">
              <Laptop className="h-3.5 w-3.5" />
              Laptop
            </ToggleGroupItem>
            <ToggleGroupItem value="av" className="gap-1.5 rounded-[8px] px-3 text-xs">
              <Tv className="h-3.5 w-3.5" />
              AV
            </ToggleGroupItem>
          </ToggleGroup>
        </CardHeader>
        <CardContent className="space-y-3 p-0 sm:p-0">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
            <p className="text-sm text-muted-foreground">
              {selected.size} selected
              {filtered.length !== assets.length && ` · ${filtered.length} shown`}
            </p>
            <Button
              type="button"
              size="sm"
              className="gap-1.5 rounded-[8px]"
              disabled={selected.size === 0 || adding}
              onClick={() => void handleAdd()}
            >
              <PackagePlus className="h-4 w-4" />
              {adding ? 'Adding…' : 'Add to request pool'}
            </Button>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-10">
                    <Checkbox
                      checked={allFilteredSelected ? true : someFilteredSelected ? 'indeterminate' : false}
                      onCheckedChange={(v) => toggleAllFiltered(v === true)}
                      aria-label="Select all visible"
                    />
                  </TableHead>
                  <TableHead className="font-semibold">Kind</TableHead>
                  <TableHead className="font-semibold">ID</TableHead>
                  <TableHead className="font-semibold">Model</TableHead>
                  <TableHead className="font-semibold">Brand</TableHead>
                  <TableHead className="font-semibold">Category</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                      Loading…
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                      {assets.length === 0
                        ? 'No active laptop or AV assets found.'
                        : 'No assets match your filters.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  pagination.paginatedItems.map((a) => {
                    const key = assetKey(a.kind, a.assetId);
                    return (
                      <TableRow
                        key={key}
                        className="cursor-pointer"
                        onClick={() => toggleOne(key, !selected.has(key))}
                      >
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={selected.has(key)}
                            onCheckedChange={(v) => toggleOne(key, v === true)}
                            aria-label={`Select ${a.kind} ${a.assetId}`}
                          />
                        </TableCell>
                        <KindCell kind={a.kind} />
                        <TableCell>
                          <code className="text-xs">{a.assetId}</code>
                        </TableCell>
                        <TableCell className="font-medium">{a.model ?? '—'}</TableCell>
                        <TableCell className="text-muted-foreground">{a.brand ?? '—'}</TableCell>
                        <TableCell className="text-muted-foreground">{a.category ?? '—'}</TableCell>
                        <TableCell>
                          <AssetStatusBadge statusId={a.statusId} />
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
          <AssetTablePagination
            page={pagination.page}
            totalPages={pagination.totalPages}
            pageSize={pagination.pageSize}
            rangeStart={pagination.rangeStart}
            rangeEnd={pagination.rangeEnd}
            totalItems={pagination.totalItems}
            totalLoaded={assets.length}
            onPageChange={pagination.setPage}
            onPageSizeChange={pagination.setPageSize}
          />
        </CardContent>
      </Card>
    </TechnicianShell>
  );
}

function KindCell({ kind }: { kind: RequestAssignableKind }) {
  return (
    <TableCell>
      <span className="inline-flex items-center gap-1.5 text-sm">
        {kind === 'laptop' ? (
          <Laptop className="h-4 w-4 text-[oklch(0.45_0.12_290)]" />
        ) : (
          <Tv className="h-4 w-4 text-[oklch(0.45_0.12_290)]" />
        )}
        {kind === 'laptop' ? 'Laptop' : 'AV'}
      </span>
    </TableCell>
  );
}

