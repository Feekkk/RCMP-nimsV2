import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { ArrowRight, ChevronDown, Laptop, Package, Search, Tv } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
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
import { readTechnicianSession } from '@/lib/auth-session';
import type { PendingRequest, RequestItemRow, RequestPoolAsset } from '@/lib/request-schema';
import { TechnicianShell } from '@/technician/technician-shell';
import {
  assignPoolAssetToRequestFn,
  listAvailablePoolAssetsFn,
  listPendingRequestsFn,
} from '@/server/request.functions';

function poolAssetLabel(a: RequestPoolAsset): string {
  const kind = a.kind === 'laptop' ? 'Laptop' : 'AV';
  const parts = [kind, `#${a.assetId}`, a.model, a.brand, a.category].filter(Boolean);
  return parts.join(' · ');
}

function itemMatchesPoolAsset(item: RequestItemRow, asset: RequestPoolAsset): boolean {
  const type = item.assetType.toLowerCase();
  if (asset.kind === 'laptop') {
    if (type.includes('laptop') || type.includes('desktop') || type.includes('computer')) return true;
  } else {
    if (
      type.includes('av') ||
      type.includes('projector') ||
      type.includes('camera') ||
      type.includes('speaker') ||
      type.includes('tv') ||
      type.includes('display')
    ) {
      return true;
    }
  }
  const cat = asset.category?.toLowerCase() ?? '';
  return cat.length > 0 && (type.includes(cat) || cat.includes(type));
}

function assignedCountForItem(req: PendingRequest, item: RequestItemRow): number {
  const matching = req.assignments.filter((a) => {
    const type = item.assetType.toLowerCase();
    if (a.kind === 'laptop') {
      return type.includes('laptop') || type.includes('desktop') || type.includes('computer');
    }
    return (
      type.includes('av') ||
      type.includes('projector') ||
      type.includes('camera') ||
      type.includes('speaker')
    );
  });
  return matching.length;
}

export function TechnicianRequestPage() {
  const [requests, setRequests] = useState<PendingRequest[]>([]);
  const [pool, setPool] = useState<RequestPoolAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [openId, setOpenId] = useState<number | null>(null);
  const [pickByItem, setPickByItem] = useState<Record<string, string>>({});
  const [assigningKey, setAssigningKey] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [reqs, available] = await Promise.all([
        listPendingRequestsFn(),
        listAvailablePoolAssetsFn(),
      ]);
      setRequests(reqs);
      setPool(available);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load requests');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return requests;
    return requests.filter((r) =>
      [
        String(r.requestId),
        r.requesterName,
        r.requestedBy,
        r.programType,
        r.usageLocation,
        r.reason,
        ...r.items.map((i) => i.assetType),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(q),
    );
  }, [requests, search]);

  const handleAssign = async (req: PendingRequest, item: RequestItemRow) => {
    const key = `${req.requestId}-${item.requestItemId}`;
    const pick = pickByItem[key];
    if (!pick) {
      toast.error('Select an asset from the pool');
      return;
    }
    const [kind, idStr] = pick.split(':');
    const assetId = Number(idStr);
    if ((kind !== 'laptop' && kind !== 'av') || Number.isNaN(assetId)) {
      toast.error('Invalid asset selection');
      return;
    }

    const session = readTechnicianSession();
    if (!session?.staffId) {
      toast.error('Technician session required');
      return;
    }

    setAssigningKey(key);
    try {
      await assignPoolAssetToRequestFn({
        data: {
          requestId: req.requestId,
          requestItemId: item.requestItemId,
          kind,
          assetId,
          assignedBy: session.staffId,
          remarks: null,
        },
      });
      toast.success(`Assigned ${kind} #${assetId} to request #${req.requestId}`);
      setPickByItem((prev) => ({ ...prev, [key]: '' }));
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Assignment failed');
    } finally {
      setAssigningKey(null);
    }
  };

  const optionsForItem = (item: RequestItemRow) =>
    pool.filter((a) => itemMatchesPoolAsset(item, a));

  return (
    <TechnicianShell>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">User requests</h1>
          <p className="mt-1 max-w-xl text-xs text-muted-foreground sm:text-sm">
            Review submitted requests and assign assets from the{' '}
            <Link
              to="/technician/request-assets"
              className="font-medium text-foreground underline-offset-2 hover:underline"
            >
              request pool
            </Link>{' '}
           . Add assets to the pool first if none are available.
          </p>
        </div>
        <Button variant="outline" size="sm" className="shrink-0 gap-1.5 rounded-[8px]" asChild>
          <Link to="/technician/request-assets">
            Request pool
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>

      <Card className="mb-4 rounded-[14px] border-border shadow-sm">
        <CardHeader className="flex flex-col gap-3 pb-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-base">Pending requests</CardTitle>
            <CardDescription>
              {pool.length} asset{pool.length === 1 ? '' : 's'} available in pool
            </CardDescription>
          </div>
          <div className="relative w-full sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search requests…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 rounded-[8px] pl-9"
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>
          ) : filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No pending user requests.</p>
          ) : (
            filtered.map((req) => {
              const isOpen = openId === req.requestId;
              const totalNeeded = req.items.reduce((n, i) => n + i.quantity, 0);
              const totalAssigned = req.assignments.length;

              return (
                <Collapsible
                  key={req.requestId}
                  open={isOpen}
                  onOpenChange={(open) => setOpenId(open ? req.requestId : null)}
                  className="rounded-[12px] border border-border"
                >
                  <CollapsibleTrigger className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-secondary/40">
                    <ChevronDown
                      className={`mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold">Request #{req.requestId}</span>
                        <Badge variant="secondary" className="rounded-[6px] text-[10px]">
                          {req.requesterName}
                        </Badge>
                        <Badge variant="outline" className="rounded-[6px] text-[10px] tabular-nums">
                          {totalAssigned}/{totalNeeded} assigned
                        </Badge>
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {req.borrowDate} → {req.returnDate} · {req.programType} · {req.usageLocation}
                      </p>
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="border-t border-border px-4 py-4">
                    {req.reason && (
                      <p className="mb-3 text-sm text-muted-foreground">
                        <span className="font-medium text-foreground">Reason:</span> {req.reason}
                      </p>
                    )}

                    <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Requested categories
                    </h3>
                    <div className="space-y-3">
                      {req.items.map((item) => {
                        const key = `${req.requestId}-${item.requestItemId}`;
                        const assigned = assignedCountForItem(req, item);
                        const options = optionsForItem(item);
                        const fulfilled = assigned >= item.quantity;

                        return (
                          <div
                            key={item.requestItemId}
                            className="rounded-[10px] border border-border/80 bg-card/50 p-3"
                          >
                            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                              <span className="text-sm font-medium">
                                {item.assetType}{' '}
                                <span className="text-muted-foreground">× {item.quantity}</span>
                              </span>
                              <Badge
                                variant={fulfilled ? 'default' : 'outline'}
                                className="rounded-[6px] text-[10px]"
                              >
                                {assigned}/{item.quantity} filled
                              </Badge>
                            </div>
                            {!fulfilled && (
                              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                                <Select
                                  value={pickByItem[key] || undefined}
                                  onValueChange={(v) =>
                                    setPickByItem((prev) => ({ ...prev, [key]: v }))
                                  }
                                >
                                  <SelectTrigger className="h-9 flex-1 rounded-[8px]">
                                    <SelectValue placeholder="Select pooled asset…" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {options.length === 0 ? (
                                      <SelectItem value="_none" disabled>
                                        No matching assets in pool
                                      </SelectItem>
                                    ) : (
                                      options.map((a) => (
                                        <SelectItem
                                          key={`${a.kind}-${a.assetId}`}
                                          value={`${a.kind}:${a.assetId}`}
                                        >
                                          {poolAssetLabel(a)}
                                        </SelectItem>
                                      ))
                                    )}
                                  </SelectContent>
                                </Select>
                                <Button
                                  type="button"
                                  size="sm"
                                  className="shrink-0 rounded-[8px]"
                                  disabled={assigningKey === key || options.length === 0}
                                  onClick={() => void handleAssign(req, item)}
                                >
                                  {assigningKey === key ? 'Assigning…' : 'Assign'}
                                </Button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {req.assignments.length > 0 && (
                      <>
                        <h3 className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Assigned assets
                        </h3>
                        <div className="overflow-x-auto rounded-[10px] border border-border">
                          <Table>
                            <TableHeader>
                              <TableRow className="hover:bg-transparent">
                                <TableHead>Kind</TableHead>
                                <TableHead>ID</TableHead>
                                <TableHead>Model</TableHead>
                                <TableHead>Brand</TableHead>
                                <TableHead>Assigned</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {req.assignments.map((a) => (
                                <TableRow key={a.assignmentId}>
                                  <TableCell>
                                    <span className="inline-flex items-center gap-1.5 text-sm">
                                      {a.kind === 'laptop' ? (
                                        <Laptop className="h-4 w-4" />
                                      ) : (
                                        <Tv className="h-4 w-4" />
                                      )}
                                      {a.kind === 'laptop' ? 'Laptop' : 'AV'}
                                    </span>
                                  </TableCell>
                                  <TableCell>
                                    <code className="text-xs">{a.assetId}</code>
                                  </TableCell>
                                  <TableCell>{a.model ?? '—'}</TableCell>
                                  <TableCell className="text-muted-foreground">{a.brand ?? '—'}</TableCell>
                                  <TableCell className="text-xs text-muted-foreground">
                                    {a.assignedAt
                                      ? new Date(a.assignedAt).toLocaleString()
                                      : '—'}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </>
                    )}

                    {pool.length === 0 && (
                      <p className="mt-3 flex items-center gap-2 text-xs text-amber-700">
                        <Package className="h-3.5 w-3.5 shrink-0" />
                        No assets available in the request pool.{' '}
                        <Link to="/technician/request-assets" className="underline">
                          Add assets first
                        </Link>
                        .
                      </p>
                    )}
                  </CollapsibleContent>
                </Collapsible>
              );
            })
          )}
        </CardContent>
      </Card>
    </TechnicianShell>
  );
}


