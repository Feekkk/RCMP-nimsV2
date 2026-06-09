import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronDown, Laptop, Search, Tv } from 'lucide-react';
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
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { isoToLocalDate, localDateToIso } from '@/lib/date-format';
import type { RequestLogAssignment, RequestLogEntry } from '@/lib/request-schema';
import { AssetStatusBadge } from '@/technician/asset-status-badge';
import { DatePickerField } from '@/technician/deploy-return-fields';
import { TechnicianShell } from '@/technician/technician-shell';
import { listRequestLogFn } from '@/server/request.functions';

type LogEvent = {
  at: string;
  sortKey: number;
  label: string;
  detail: string;
};

function assetLabel(a: RequestLogAssignment): string {
  const kind = a.kind === 'laptop' ? 'Laptop' : 'AV';
  return [kind, `#${a.assetId}`, a.model, a.brand].filter(Boolean).join(' · ');
}

function buildLogEvents(entry: RequestLogEntry): LogEvent[] {
  const events: LogEvent[] = [];

  if (entry.createdAt) {
    events.push({
      at: entry.createdAt,
      sortKey: new Date(entry.createdAt).getTime(),
      label: 'Submitted',
      detail: `Request created by ${entry.requesterName}`,
    });
  }

  if (entry.rejectedAt) {
    events.push({
      at: entry.rejectedAt,
      sortKey: new Date(entry.rejectedAt).getTime(),
      label: 'Rejected',
      detail: entry.rejectionReason?.trim() || 'Request rejected',
    });
  }

  for (const a of entry.assignments) {
    if (a.assignedAt) {
      events.push({
        at: a.assignedAt,
        sortKey: new Date(a.assignedAt).getTime(),
        label: 'Booked',
        detail: assetLabel(a),
      });
    }
    if (a.checkoutAt) {
      events.push({
        at: a.checkoutAt,
        sortKey: new Date(a.checkoutAt).getTime(),
        label: 'Checked out',
        detail: assetLabel(a),
      });
    }
    if (a.returnedAt) {
      const cond = a.returnCondition ? ` · ${a.returnCondition}` : '';
      events.push({
        at: a.returnedAt,
        sortKey: new Date(a.returnedAt).getTime(),
        label: 'Returned',
        detail: `${assetLabel(a)}${cond}`,
      });
    }
  }

  return events.sort((x, y) => y.sortKey - x.sortKey);
}

/** Inclusive borrow-period overlap with optional from/to ISO dates. */
function requestMatchesDateFilter(entry: RequestLogEntry, fromIso: string, toIso: string): boolean {
  if (!fromIso && !toIso) return true;
  if (fromIso && entry.returnDate < fromIso) return false;
  if (toIso && entry.borrowDate > toIso) return false;
  return true;
}

function logStatusLabel(entry: RequestLogEntry): { text: string; variant: 'default' | 'destructive' | 'outline' | 'secondary' } {
  if (entry.rejectedAt) return { text: 'Rejected', variant: 'destructive' };
  const totalQty = entry.items.reduce((n, i) => n + i.quantity, 0);
  const totalReturned = entry.items.reduce((n, i) => n + i.returnedCount, 0);
  if (totalQty > 0 && totalReturned >= totalQty) return { text: 'Completed', variant: 'default' };
  const open = entry.assignments.filter((a) => !a.returnedAt);
  if (open.some((a) => a.checkoutAt)) return { text: 'In use', variant: 'outline' };
  if (open.length > 0) return { text: 'Preparing', variant: 'secondary' };
  return { text: 'Submitted', variant: 'outline' };
}

export function TechnicianRequestLogPage() {
  const [entries, setEntries] = useState<RequestLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [openId, setOpenId] = useState<number | null>(null);

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
      setEntries(await listRequestLogFn());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load request log');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    if (dateRangeInvalid) return [];
    const q = search.trim().toLowerCase();
    return entries.filter((e) => {
      if (!requestMatchesDateFilter(e, dateFrom, dateTo)) return false;
      if (!q) return true;
      return [
        String(e.requestId),
        e.requesterName,
        e.requestedBy,
        e.programType,
        e.usageLocation,
        e.reason,
        ...e.items.map((i) => i.assetType),
        ...e.assignments.map((a) => assetLabel(a)),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(q);
    });
  }, [entries, search, dateFrom, dateTo, dateRangeInvalid]);

  return (
    <TechnicianShell>
      <div className="mb-6">
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Request log</h1>
        <p className="mt-1 max-w-xl text-sm text-muted-foreground">
          Full audit trail of user requests — booking, checkout, and return events with asset
          details.
        </p>
      </div>

      <Card className="mb-4 rounded-[14px] border-border shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="text-base">All requests</CardTitle>
              <CardDescription>
                {filtered.length} request{filtered.length === 1 ? '' : 's'}
                {filtered.length !== entries.length && ` of ${entries.length}`}
                {dateRangeInvalid && ' · End date must be on or after start date'}
              </CardDescription>
            </div>
            <div className="relative w-full sm:max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search log…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 rounded-[8px] pl-9"
              />
            </div>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto] lg:items-end">
            <DatePickerField label="From date" value={dateFrom} onChange={setDateFrom} />
            <DatePickerField label="To date" value={dateTo} onChange={setDateTo} />
            <div className="flex flex-wrap gap-2 sm:col-span-2 lg:col-span-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-[8px]"
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
                size="sm"
                className="rounded-[8px]"
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
                size="sm"
                className="rounded-[8px]"
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
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>
          ) : filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No requests found.</p>
          ) : (
            filtered.map((entry) => {
              const isOpen = openId === entry.requestId;
              const status = logStatusLabel(entry);
              const events = buildLogEvents(entry);

              return (
                <Collapsible
                  key={entry.requestId}
                  open={isOpen}
                  onOpenChange={(open) => setOpenId(open ? entry.requestId : null)}
                  className="rounded-[12px] border border-border"
                >
                  <CollapsibleTrigger className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-secondary/40">
                    <ChevronDown
                      className={`mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold">{entry.requesterName}</span>
                        <Badge variant="outline" className="rounded-[6px] text-[10px] tabular-nums">
                          #{entry.requestId}
                        </Badge>
                        <Badge variant={status.variant} className="rounded-[6px] text-[10px]">
                          {status.text}
                        </Badge>
                        <Badge variant="outline" className="rounded-[6px] text-[10px] tabular-nums">
                          {events.length} event{events.length === 1 ? '' : 's'}
                        </Badge>
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {entry.borrowDate} → {entry.returnDate} · {entry.programType} ·{' '}
                        {entry.usageLocation}
                      </p>
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="border-t border-border px-4 py-4">
                    {entry.reason && (
                      <p className="mb-3 text-sm text-muted-foreground">
                        <span className="font-medium text-foreground">Reason:</span> {entry.reason}
                      </p>
                    )}

                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Categories requested
                    </p>
                    <ul className="mb-4 space-y-1">
                      {entry.items.map((i) => (
                        <li
                          key={i.requestItemId}
                          className="flex justify-between rounded-[8px] border border-border/80 px-3 py-1.5 text-sm"
                        >
                          <span>{i.assetType}</span>
                          <span className="text-muted-foreground">
                            × {i.quantity}
                            {i.returnedCount > 0 && ` · ${i.returnedCount} returned`}
                          </span>
                        </li>
                      ))}
                    </ul>

                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Event log
                    </p>
                    <div className="overflow-x-auto rounded-[10px] border border-border">
                      <Table>
                        <TableHeader>
                          <TableRow className="hover:bg-transparent">
                            <TableHead className="w-44">When</TableHead>
                            <TableHead className="w-32">Event</TableHead>
                            <TableHead>Details</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {events.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={3} className="text-sm text-muted-foreground">
                                No assignment events yet.
                              </TableCell>
                            </TableRow>
                          ) : (
                            events.map((ev, idx) => (
                              <TableRow key={`${ev.label}-${ev.at}-${idx}`}>
                                <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                                  {new Date(ev.at).toLocaleString()}
                                </TableCell>
                                <TableCell className="text-sm font-medium">{ev.label}</TableCell>
                                <TableCell className="text-sm">{ev.detail}</TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>

                    {entry.assignments.length > 0 && (
                      <>
                        <p className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Assignments
                        </p>
                        <div className="overflow-x-auto rounded-[10px] border border-border">
                          <Table>
                            <TableHeader>
                              <TableRow className="hover:bg-transparent">
                                <TableHead>Asset</TableHead>
                                <TableHead>Category</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Booked</TableHead>
                                <TableHead>Checkout</TableHead>
                                <TableHead>Returned</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {entry.assignments.map((a) => (
                                <TableRow key={a.assignmentId}>
                                  <TableCell>
                                    <span className="inline-flex items-center gap-1.5 text-sm">
                                      {a.kind === 'laptop' ? (
                                        <Laptop className="h-3.5 w-3.5 text-muted-foreground" />
                                      ) : (
                                        <Tv className="h-3.5 w-3.5 text-muted-foreground" />
                                      )}
                                      {assetLabel(a)}
                                    </span>
                                  </TableCell>
                                  <TableCell className="text-sm">{a.assetType ?? '—'}</TableCell>
                                  <TableCell>
                                    <AssetStatusBadge statusId={a.assetStatusId} />
                                  </TableCell>
                                  <TableCell className="text-xs text-muted-foreground">
                                    {a.assignedAt ? new Date(a.assignedAt).toLocaleString() : '—'}
                                  </TableCell>
                                  <TableCell className="text-xs text-muted-foreground">
                                    {a.checkoutAt ? new Date(a.checkoutAt).toLocaleString() : '—'}
                                  </TableCell>
                                  <TableCell className="text-xs text-muted-foreground">
                                    {a.returnedAt ? new Date(a.returnedAt).toLocaleString() : '—'}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </>
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
