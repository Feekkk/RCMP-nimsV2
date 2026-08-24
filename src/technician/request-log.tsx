import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { Laptop, Search, Tv } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { usePagination } from '@/hooks/use-pagination';
import { formatDateLabel, isoToLocalDate, localDateToIso } from '@shared/lib/date-format';
import type { RequestLogAssignment, RequestLogEntry } from '@shared/lib/request-schema';
import { cn } from '@/lib/utils';
import { AssetStatusBadge } from '@/technician/asset-status-badge';
import { AssetTablePagination } from '@/technician/asset-table-pagination';
import { DatePickerField } from '@/technician/deploy-return-fields';
import { RequestToolbarActions } from '@/technician/request-toolbar-actions';
import { TechnicianShell } from '@/technician/technician-shell';
import { listRequestLogFn } from '@backend/server/requests/request.functions';

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

function requestMatchesDateFilter(entry: RequestLogEntry, fromIso: string, toIso: string): boolean {
  if (!fromIso && !toIso) return true;
  if (fromIso && entry.returnDate < fromIso) return false;
  if (toIso && entry.borrowDate > toIso) return false;
  return true;
}

function logStatusLabel(entry: RequestLogEntry): { text: string; className: string } {
  if (entry.rejectedAt) {
    return {
      text: 'Rejected',
      className: 'border-transparent bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200',
    };
  }
  const totalQty = entry.items.reduce((n, i) => n + i.quantity, 0);
  const totalReturned = entry.items.reduce((n, i) => n + i.returnedCount, 0);
  if (totalQty > 0 && totalReturned >= totalQty) {
    return {
      text: 'Completed',
      className:
        'border-transparent bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200',
    };
  }
  const open = entry.assignments.filter((a) => !a.returnedAt);
  if (open.some((a) => a.checkoutAt)) {
    return {
      text: 'In use',
      className: 'border-transparent bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200',
    };
  }
  if (open.length > 0) {
    return {
      text: 'Preparing',
      className:
        'border-transparent bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-200',
    };
  }
  return {
    text: 'Submitted',
    className: 'border-transparent bg-muted text-muted-foreground',
  };
}

function eventBadgeClass(label: string): string {
  switch (label) {
    case 'Rejected':
      return 'border-transparent bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200';
    case 'Returned':
      return 'border-transparent bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200';
    case 'Checked out':
      return 'border-transparent bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200';
    case 'Booked':
      return 'border-transparent bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-200';
    default:
      return 'border-transparent bg-muted text-muted-foreground';
  }
}

function dayHeading(iso: string): string {
  const date = isoToLocalDate(iso);
  if (!date) return iso;
  const todayIso = localDateToIso(new Date());
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (iso === todayIso) return 'Today';
  if (iso === localDateToIso(yesterday)) return 'Yesterday';
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatDateTime(at: string): string {
  const d = new Date(at);
  if (Number.isNaN(d.getTime())) return at;
  return d.toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function groupByBorrowDate(entries: RequestLogEntry[]): [string, RequestLogEntry[]][] {
  const map = new Map<string, RequestLogEntry[]>();
  for (const entry of entries) {
    const list = map.get(entry.borrowDate);
    if (list) list.push(entry);
    else map.set(entry.borrowDate, [entry]);
  }
  return [...map.entries()];
}

export function TechnicianRequestLogPage() {
  const [entries, setEntries] = useState<RequestLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);

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
    return entries
      .filter((e) => {
        if (!requestMatchesDateFilter(e, dateFrom, dateTo)) return false;
        if (!q) return true;
        return [
          String(e.requestId),
          e.requesterName,
          e.requestedBy,
          e.programType,
          e.usageLocation,
          e.remarks,
          ...e.items.map((i) => i.assetType),
          ...e.assignments.map((a) => assetLabel(a)),
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(q);
      })
      .sort((a, b) => {
        const byDate = b.borrowDate.localeCompare(a.borrowDate);
        if (byDate !== 0) return byDate;
        return b.requestId - a.requestId;
      });
  }, [entries, search, dateFrom, dateTo, dateRangeInvalid]);

  const pagination = usePagination(filtered, {
    pageSize: 15,
    resetKey: `${search}|${dateFrom}|${dateTo}|${filtered.length}`,
  });

  const grouped = useMemo(
    () => groupByBorrowDate(pagination.paginatedItems),
    [pagination.paginatedItems],
  );

  const selected = useMemo(
    () => entries.find((e) => e.requestId === selectedId) ?? null,
    [entries, selectedId],
  );

  return (
    <TechnicianShell>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Request log</h1>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            Requests grouped by borrow date. Open a row for booking, checkout, and return details.
          </p>
        </div>
        <RequestToolbarActions />
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
      </Card>

      <Card className="mb-4 overflow-hidden rounded-[14px] border-border shadow-sm">
        <CardContent className="p-0">
          {loading ? (
            <p className="py-16 text-center text-sm text-muted-foreground">Loading…</p>
          ) : grouped.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted-foreground">No requests found.</p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="h-9 text-xs">Request</TableHead>
                    <TableHead className="h-9 text-xs">Status</TableHead>
                    <TableHead className="hidden h-9 text-xs sm:table-cell">Period</TableHead>
                    <TableHead className="hidden h-9 text-xs md:table-cell">Program</TableHead>
                    <TableHead className="hidden h-9 text-right text-xs lg:table-cell">
                      Events
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {grouped.map(([day, dayEntries]) => (
                    <Fragment key={day}>
                      <TableRow className="bg-muted/40 hover:bg-muted/40">
                        <TableCell colSpan={5} className="py-2 text-xs font-medium text-muted-foreground">
                          {dayHeading(day)}
                          <span className="ml-2 tabular-nums">
                            ({dayEntries.length} request{dayEntries.length === 1 ? '' : 's'})
                          </span>
                        </TableCell>
                      </TableRow>
                      {dayEntries.map((entry) => {
                        const status = logStatusLabel(entry);
                        const events = buildLogEvents(entry);
                        return (
                          <TableRow
                            key={entry.requestId}
                            className="cursor-pointer hover:bg-muted/30"
                            onClick={() => setSelectedId(entry.requestId)}
                          >
                            <TableCell className="py-3">
                              <p className="font-medium text-foreground">{entry.requesterName}</p>
                              <p className="text-xs tabular-nums text-muted-foreground">
                                #{entry.requestId}
                                <span className="sm:hidden">
                                  {' · '}
                                  {formatDateLabel(entry.borrowDate)} → {formatDateLabel(entry.returnDate)}
                                </span>
                              </p>
                            </TableCell>
                            <TableCell className="py-3">
                              <Badge variant="secondary" className={cn('rounded-[6px] text-[10px]', status.className)}>
                                {status.text}
                              </Badge>
                            </TableCell>
                            <TableCell className="hidden py-3 text-sm text-muted-foreground sm:table-cell">
                              {formatDateLabel(entry.borrowDate)} → {formatDateLabel(entry.returnDate)}
                            </TableCell>
                            <TableCell className="hidden py-3 md:table-cell">
                              <p className="text-sm">{entry.programType}</p>
                              <p className="text-xs text-muted-foreground">{entry.usageLocation}</p>
                            </TableCell>
                            <TableCell className="hidden py-3 text-right text-xs tabular-nums text-muted-foreground lg:table-cell">
                              {events.length}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </Fragment>
                  ))}
                </TableBody>
              </Table>
              <AssetTablePagination
                page={pagination.page}
                totalPages={pagination.totalPages}
                pageSize={pagination.pageSize}
                rangeStart={pagination.rangeStart}
                rangeEnd={pagination.rangeEnd}
                totalItems={pagination.totalItems}
                totalLoaded={entries.length}
                onPageChange={pagination.setPage}
                onPageSizeChange={pagination.setPageSize}
              />
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={selected != null} onOpenChange={(open) => !open && setSelectedId(null)}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto rounded-[14px]">
          {selected && <RequestLogDetail entry={selected} />}
        </DialogContent>
      </Dialog>
    </TechnicianShell>
  );
}

function RequestLogDetail({ entry }: { entry: RequestLogEntry }) {
  const status = logStatusLabel(entry);
  const events = buildLogEvents(entry);

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex flex-wrap items-center gap-2">
          <span>{entry.requesterName}</span>
          <Badge variant="outline" className="rounded-[6px] text-[10px] tabular-nums">
            #{entry.requestId}
          </Badge>
          <Badge variant="secondary" className={cn('rounded-[6px] text-[10px]', status.className)}>
            {status.text}
          </Badge>
        </DialogTitle>
        <DialogDescription>
          {formatDateLabel(entry.borrowDate)} → {formatDateLabel(entry.returnDate)} · {entry.programType}{' '}
          · {entry.usageLocation}
        </DialogDescription>
      </DialogHeader>

      {entry.remarks && (
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">Remarks:</span> {entry.remarks}
        </p>
      )}

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Categories requested
        </p>
        <ul className="space-y-1">
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
      </div>

      <div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Event log
        </p>
        {events.length === 0 ? (
          <p className="text-sm text-muted-foreground">No assignment events yet.</p>
        ) : (
          <ol className="space-y-3 border-l border-border pl-4">
            {events.map((ev, idx) => (
              <li key={`${ev.label}-${ev.at}-${idx}`} className="relative">
                <span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-muted-foreground/50" />
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary" className={cn('rounded-[6px] text-[10px]', eventBadgeClass(ev.label))}>
                    {ev.label}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{formatDateTime(ev.at)}</span>
                </div>
                <p className="mt-1 text-sm">{ev.detail}</p>
              </li>
            ))}
          </ol>
        )}
      </div>

      {entry.assignments.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
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
                      {a.assignedAt ? formatDateTime(a.assignedAt) : '—'}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {a.checkoutAt ? formatDateTime(a.checkoutAt) : '—'}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {a.returnedAt ? formatDateTime(a.returnedAt) : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </>
  );
}
