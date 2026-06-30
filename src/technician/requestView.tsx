import { useCallback, useEffect, useMemo, useState } from 'react';
import { Laptop, Search, Tv } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { REQUEST_STATUS_ACTIVE } from '@/lib/request-schema';
import type { RequestAssignableKind, RequestPoolAsset } from '@/lib/request-schema';
import { AssetStatusBadge } from '@/technician/asset-status-badge';
import { TechnicianShell } from '@/technician/technician-shell';
import { RequestToolbarActions } from '@/technician/request-toolbar-actions';
import { listRequestPoolAssetsFn } from '@/server/request.functions';

type KindFilter = 'all' | RequestAssignableKind;

export function TechnicianRequestViewPage() {
  const [assets, setAssets] = useState<RequestPoolAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [kindFilter, setKindFilter] = useState<KindFilter>('all');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await listRequestPoolAssetsFn();
      setAssets(rows);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load request pool');
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
      [
        String(a.assetId),
        a.model,
        a.brand,
        a.category,
        a.serialNum,
        a.kind,
        a.requestId != null ? String(a.requestId) : 'available',
        a.requesterName,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(q),
    );
  }, [assets, search, kindFilter]);

  const assignedCount = assets.filter((a) => a.assignmentId != null).length;
  const availableCount = assets.length - assignedCount;

  return (
    <TechnicianShell>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Request pool</h1>
          <p className="mt-1 max-w-xl text-xs text-muted-foreground sm:text-sm">
            Assigned laptop &amp; AV assets. {' '}
            {availableCount} available · {assignedCount} assigned to a user request.
          </p>
        </div>
        <RequestToolbarActions />
      </div>

      <Card className="rounded-[14px] border-border shadow-sm">
        <CardHeader className="flex flex-col gap-3 pb-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-base">Request pool</CardTitle>
              <CardDescription>
                {filtered.length} shown · {assets.length} total in pool
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
          </div>
          <ToggleGroup
            type="single"
            value={kindFilter}
            onValueChange={(v) => {
              if (v) setKindFilter(v as KindFilter);
            }}
            className="justify-start"
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
        <CardContent className="p-0 sm:p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="font-semibold">Kind</TableHead>
                  <TableHead className="font-semibold">ID</TableHead>
                  <TableHead className="font-semibold">Model</TableHead>
                  <TableHead className="font-semibold">Brand</TableHead>
                  <TableHead className="font-semibold">Category</TableHead>
                  <TableHead className="font-semibold">Assignment</TableHead>
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
                        ? 'No assets in the request pool yet. Add assets from the previous page.'
                        : 'No assets match your filters.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((a) => (
                    <TableRow key={`${a.kind}-${a.assetId}`}>
                      <KindCell kind={a.kind} />
                      <TableCell>
                        <code className="text-xs">{a.assetId}</code>
                      </TableCell>
                      <TableCell className="font-medium">{a.model ?? '—'}</TableCell>
                      <TableCell className="text-muted-foreground">{a.brand ?? '—'}</TableCell>
                      <TableCell className="text-muted-foreground">{a.category ?? '—'}</TableCell>
                      <TableCell>
                        {a.assignmentId ? (
                          <>
                            <span className="text-sm font-medium">Request #{a.requestId}</span>
                            {a.requesterName && (
                              <span className="mt-0.5 block text-xs text-muted-foreground">
                                {a.requesterName}
                              </span>
                            )}
                            <Badge variant="secondary" className="mt-1 rounded-[6px] text-[10px]">
                              Assigned
                            </Badge>
                          </>
                        ) : (
                          <Badge
                            variant="outline"
                            className="rounded-[6px] border-emerald-200 bg-emerald-50 text-[10px] text-emerald-700"
                          >
                            Available
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <AssetStatusBadge statusId={a.statusId} />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
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
