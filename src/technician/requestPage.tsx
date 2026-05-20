import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { ArrowRight, ChevronDown, Laptop, Search, Tv, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Textarea } from '@/components/ui/textarea';
import { readTechnicianSession } from '@/lib/auth-session';
import {
  REQUEST_STATUS_ACTIVE,
  REQUEST_STATUS_BOOKED,
  REQUEST_STATUS_CHECKOUT,
} from '@/lib/request-schema';
import type {
  PendingRequest,
  RequestAssignableKind,
  RequestAssignmentRow,
  RequestItemRow,
  RequestPoolAsset,
} from '@/lib/request-schema';
import { kindGroupLabel, requestItemKindFromAssetType } from '@/lib/request-asset-types';
import { AssetStatusBadge } from '@/technician/asset-status-badge';
import { TechnicianShell } from '@/technician/technician-shell';
import {
  bookPoolAssetToRequestFn,
  changeBookedAssignmentFn,
  checkoutUserRequestFn,
  listAvailablePoolAssetsFn,
  listPendingRequestsFn,
  markRequestSlotUnavailableFn,
  rejectUserRequestFn,
  returnUserRequestFn,
} from '@/server/request.functions';

const UNAVAILABLE_PICK = 'unavailable';
import { RequestReturnFields } from '@/technician/request-return-fields';

function poolAssetLabel(a: RequestPoolAsset): string {
  const kind = a.kind === 'laptop' ? 'Laptop' : 'AV';
  const parts = [kind, `#${a.assetId}`, a.model, a.brand, a.category].filter(Boolean);
  return parts.join(' · ');
}

function bookedAssetLabel(a: RequestAssignmentRow): string {
  if (a.unavailable) return 'Unavailable';
  const kind = a.kind === 'laptop' ? 'Laptop' : 'AV';
  return [kind, a.assetId != null ? `#${a.assetId}` : null, a.model, a.brand]
    .filter(Boolean)
    .join(' · ');
}

function bookedAwaitingCheckout(req: PendingRequest): RequestAssignmentRow[] {
  return req.assignments.filter(
    (a) =>
      !a.unavailable &&
      a.checkoutAt == null &&
      a.assetStatusId === REQUEST_STATUS_BOOKED,
  );
}

type KindGroup = {
  kind: RequestAssignableKind;
  label: string;
  items: RequestItemRow[];
  quantity: number;
  returnedCount: number;
  requestedSummary: string;
};

function kindGroupsForRequest(req: PendingRequest): KindGroup[] {
  const laptopItems = req.items.filter(
    (i) => requestItemKindFromAssetType(i.assetType) === 'laptop',
  );
  const avItems = req.items.filter((i) => requestItemKindFromAssetType(i.assetType) === 'av');

  const build = (kind: RequestAssignableKind, items: RequestItemRow[]): KindGroup => ({
    kind,
    label: kindGroupLabel(kind),
    items,
    quantity: items.reduce((n, i) => n + i.quantity, 0),
    returnedCount: items.reduce((n, i) => n + i.returnedCount, 0),
    requestedSummary: items.map((i) => `${i.assetType} ×${i.quantity}`).join(', '),
  });

  const groups: KindGroup[] = [];
  if (laptopItems.length > 0) groups.push(build('laptop', laptopItems));
  if (avItems.length > 0) groups.push(build('av', avItems));
  return groups;
}

function assignmentsForKind(req: PendingRequest, group: KindGroup): RequestAssignmentRow[] {
  const itemIds = new Set(group.items.map((i) => i.requestItemId));
  return req.assignments.filter((a) => {
    if (a.requestItemId != null && itemIds.has(a.requestItemId)) return true;
    if (a.requestItemId != null) return false;
    return a.kind === group.kind;
  });
}

function checkedOutCountForGroup(req: PendingRequest, group: KindGroup): number {
  return assignmentsForKind(req, group).filter((a) => a.checkoutAt != null).length;
}

type ItemLine =
  | { lineKind: 'assignment'; assignment: RequestAssignmentRow }
  | { lineKind: 'empty' };

function linesForKindGroup(req: PendingRequest, group: KindGroup): ItemLine[] {
  const all = assignmentsForKind(req, group);
  const emptyCount = Math.max(0, group.quantity - all.length - group.returnedCount);
  return [
    ...all.map((assignment) => ({ lineKind: 'assignment' as const, assignment })),
    ...Array.from({ length: emptyCount }, () => ({ lineKind: 'empty' as const })),
  ];
}

function assignmentsForItem(req: PendingRequest, item: RequestItemRow): RequestAssignmentRow[] {
  const kind = requestItemKindFromAssetType(item.assetType);
  return req.assignments.filter((a) => {
    if (a.requestItemId === item.requestItemId) return true;
    if (a.requestItemId != null) return false;
    return a.kind === kind;
  });
}

function findItemForBooking(req: PendingRequest, group: KindGroup): RequestItemRow | null {
  for (const item of group.items) {
    const linked = assignmentsForItem(req, item);
    if (linked.length + item.returnedCount < item.quantity) return item;
  }
  return null;
}

function checkedOutAwaitingReturn(req: PendingRequest): RequestAssignmentRow[] {
  return req.assignments.filter((a) => a.checkoutAt != null);
}

export function TechnicianRequestPage() {
  const [requests, setRequests] = useState<PendingRequest[]>([]);
  const [pool, setPool] = useState<RequestPoolAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [openId, setOpenId] = useState<number | null>(null);
  const [bookingKey, setBookingKey] = useState<string | null>(null);
  const [checkoutRequestId, setCheckoutRequestId] = useState<number | null>(null);
  const [changingAssignmentId, setChangingAssignmentId] = useState<number | null>(null);
  const [rejectRequestId, setRejectRequestId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejecting, setRejecting] = useState(false);
  const [returnRequest, setReturnRequest] = useState<PendingRequest | null>(null);
  const [returnCondition, setReturnCondition] = useState('Good');
  const [returnRemarks, setReturnRemarks] = useState('');
  const [returning, setReturning] = useState(false);

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

  const handleBookOnSelect = async (
    req: PendingRequest,
    group: KindGroup,
    pick: string,
  ) => {
    if (!pick || pick === '_none') return;
    const item = findItemForBooking(req, group);
    if (!item) {
      toast.error('All slots are filled for this category');
      return;
    }

    const session = readTechnicianSession();
    if (!session?.staffId) {
      toast.error('Technician session required');
      return;
    }

    const key = `${req.requestId}-${group.kind}`;
    if (pick === UNAVAILABLE_PICK) {
      setBookingKey(key);
      try {
        await markRequestSlotUnavailableFn({
          data: {
            requestId: req.requestId,
            requestItemId: item.requestItemId,
            markedBy: session.staffId,
            remarks: null,
          },
        });
        toast.success(`${group.label} slot marked unavailable`);
        await load();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Could not mark unavailable');
      } finally {
        setBookingKey(null);
      }
      return;
    }

    const [kind, idStr] = pick.split(':');
    const assetId = Number(idStr);
    if ((kind !== 'laptop' && kind !== 'av') || Number.isNaN(assetId)) return;
    if (kind !== group.kind) return;

    setBookingKey(key);
    try {
      await bookPoolAssetToRequestFn({
        data: {
          requestId: req.requestId,
          requestItemId: item.requestItemId,
          kind,
          assetId,
          assignedBy: session.staffId,
          remarks: null,
        },
      });
      toast.success(`Booked ${kind} #${assetId} (status ${REQUEST_STATUS_BOOKED})`);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Booking failed');
    } finally {
      setBookingKey(null);
    }
  };

  const handleChangeBooked = async (
    assignment: RequestAssignmentRow,
    pick: string,
  ) => {
    if (!pick || assignment.unavailable) return;
    const current = `${assignment.kind}:${assignment.assetId}`;
    if (pick === current) return;

    const [kind, idStr] = pick.split(':');
    const assetId = Number(idStr);
    if ((kind !== 'laptop' && kind !== 'av') || Number.isNaN(assetId)) return;

    const session = readTechnicianSession();
    if (!session?.staffId) {
      toast.error('Technician session required');
      return;
    }

    setChangingAssignmentId(assignment.assignmentId);
    try {
      await changeBookedAssignmentFn({
        data: {
          assignmentId: assignment.assignmentId,
          kind,
          assetId,
          changedBy: session.staffId,
        },
      });
      toast.success(`Changed booking to ${kind} #${assetId}`);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not change booking');
    } finally {
      setChangingAssignmentId(null);
    }
  };

  const handleCheckoutRequest = async (req: PendingRequest) => {
    const session = readTechnicianSession();
    if (!session?.staffId) {
      toast.error('Technician session required');
      return;
    }
    const toCheckout = bookedAwaitingCheckout(req);
    if (toCheckout.length === 0) {
      toast.error('No booked assets to check out');
      return;
    }
    setCheckoutRequestId(req.requestId);
    try {
      const result = await checkoutUserRequestFn({
        data: { requestId: req.requestId, checkedOutBy: session.staffId },
      });
      toast.success(
        `Checked out ${result.checkedOut} asset${result.checkedOut === 1 ? '' : 's'} (status ${REQUEST_STATUS_CHECKOUT})`,
      );
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Checkout failed');
    } finally {
      setCheckoutRequestId(null);
    }
  };

  const handleReject = async () => {
    if (rejectRequestId == null) return;
    const reason = rejectReason.trim();
    if (!reason) {
      toast.error('Rejection remarks are required');
      return;
    }
    const session = readTechnicianSession();
    if (!session?.staffId) {
      toast.error('Technician session required');
      return;
    }
    setRejecting(true);
    try {
      await rejectUserRequestFn({
        data: {
          requestId: rejectRequestId,
          rejectedBy: session.staffId,
          rejectionReason: reason,
        },
      });
      toast.success('Request rejected');
      setRejectRequestId(null);
      setRejectReason('');
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Reject failed');
    } finally {
      setRejecting(false);
    }
  };

  const optionsForKind = (kind: RequestAssignableKind) =>
    pool.filter((a) => a.kind === kind);

  const openReturnForm = (req: PendingRequest) => {
    setReturnRequest(req);
    setReturnCondition('Good');
    setReturnRemarks('');
  };

  const handleReturnSubmit = async () => {
    if (!returnRequest) return;
    const condition = returnCondition.trim();
    if (!condition) {
      toast.error('Return condition is required');
      return;
    }
    const session = readTechnicianSession();
    if (!session?.staffId) {
      toast.error('Technician session required');
      return;
    }
    const toReturn = checkedOutAwaitingReturn(returnRequest);
    if (toReturn.length === 0) {
      toast.error('No checked-out assets to return');
      return;
    }
    setReturning(true);
    try {
      const result = await returnUserRequestFn({
        data: {
          requestId: returnRequest.requestId,
          returnedBy: session.staffId,
          returnCondition: condition,
          remarks: returnRemarks.trim() || null,
        },
      });
      toast.success(
        `Returned ${result.returned} asset${result.returned === 1 ? '' : 's'} to the request pool`,
      );
      setReturnRequest(null);
      setReturnRemarks('');
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Return failed');
    } finally {
      setReturning(false);
    }
  };

  const renderRequestCollapsible = (req: PendingRequest) => {
    const isOpen = openId === req.requestId;
    const totalNeeded = req.items.reduce((n, i) => n + i.quantity, 0);
    const totalCheckedOut = req.assignments.filter((a) => a.checkoutAt != null).length;
    const totalReturned = req.items.reduce((n, i) => n + i.returnedCount, 0);
    const awaitingReturn = checkedOutAwaitingReturn(req);
    const toCheckout = bookedAwaitingCheckout(req);

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
              <span className="font-semibold">{req.requesterName}</span>
              <Badge variant="outline" className="rounded-[6px] text-[10px] tabular-nums">
                #{req.requestId}
              </Badge>
              <Badge variant="outline" className="rounded-[6px] text-[10px] tabular-nums">
                {totalCheckedOut}/{totalNeeded} checked out
              </Badge>
              {totalReturned > 0 && (
                <Badge variant="secondary" className="rounded-[6px] text-[10px] tabular-nums">
                  {totalReturned} returned
                </Badge>
              )}
              {awaitingReturn.length > 0 && (
                <Badge variant="outline" className="rounded-[6px] text-[10px] tabular-nums">
                  {awaitingReturn.length} to return
                </Badge>
              )}
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

          <div className="overflow-x-auto rounded-[10px] border border-border">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[min(180px,28%)]">Category</TableHead>
                  <TableHead>Asset</TableHead>
                  <TableHead className="w-28">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {kindGroupsForRequest(req).flatMap((group) => {
                  const lines = linesForKindGroup(req, group);
                  const checkedOut = checkedOutCountForGroup(req, group);
                  const options = optionsForKind(group.kind);
                  const bookKey = `${req.requestId}-${group.kind}`;

                  if (lines.length === 0) return [];

                  return lines.map((line, lineIdx) => {
                    const rowKey =
                      line.lineKind === 'assignment'
                        ? `a-${line.assignment.assignmentId}`
                        : `e-${group.kind}-${lineIdx}`;
                    const a = line.lineKind === 'assignment' ? line.assignment : null;
                    const isCheckedOut = a?.checkoutAt != null;

                    return (
                      <TableRow key={rowKey}>
                            {lineIdx === 0 && (
                              <TableCell
                                rowSpan={lines.length}
                                className="align-top border-r border-border/60 bg-muted/20"
                              >
                                <p className="text-sm font-medium">{group.label}</p>
                                <p className="text-xs text-muted-foreground">× {group.quantity}</p>
                                <p className="mt-1 text-[10px] leading-snug text-muted-foreground">
                                  {group.requestedSummary}
                                </p>
                                <Badge
                                  variant={checkedOut >= group.quantity ? 'default' : 'outline'}
                                  className="mt-1.5 rounded-[6px] text-[10px]"
                                >
                                  {checkedOut}/{group.quantity} out
                                </Badge>
                              </TableCell>
                            )}

                        {line.lineKind === 'assignment' && a ? (
                          <>
                            <TableCell>
                              {a.unavailable ? (
                                <span className="text-sm font-medium text-amber-800 dark:text-amber-200">
                                  Unavailable
                                </span>
                              ) : !isCheckedOut && a.assetStatusId === REQUEST_STATUS_BOOKED ? (
                                <Select
                                  value={`${a.kind}:${a.assetId}`}
                                  disabled={
                                    changingAssignmentId === a.assignmentId || options.length === 0
                                  }
                                  onValueChange={(v) => void handleChangeBooked(a, v)}
                                >
                                  <SelectTrigger className="h-8 max-w-md rounded-[6px] text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value={`${a.kind}:${a.assetId}`}>
                                      {bookedAssetLabel(a)} (current)
                                    </SelectItem>
                                    {options
                                      .filter(
                                        (p) => `${p.kind}:${p.assetId}` !== `${a.kind}:${a.assetId}`,
                                      )
                                      .map((p) => (
                                        <SelectItem
                                          key={`${p.kind}-${p.assetId}`}
                                          value={`${p.kind}:${p.assetId}`}
                                        >
                                          {poolAssetLabel(p)}
                                        </SelectItem>
                                      ))}
                                  </SelectContent>
                                </Select>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 text-sm">
                                  {a.kind === 'laptop' ? (
                                    <Laptop className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                                  ) : (
                                    <Tv className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                                  )}
                                  {bookedAssetLabel(a)}
                                </span>
                              )}
                            </TableCell>
                            <TableCell>
                              {a.unavailable ? (
                                <Badge variant="outline" className="rounded-[6px] text-[10px]">
                                  Unavailable
                                </Badge>
                              ) : (
                                <>
                                  <AssetStatusBadge statusId={a.assetStatusId} />
                                  {isCheckedOut && a.checkoutAt && (
                                    <p className="mt-0.5 text-[10px] text-muted-foreground">
                                      {new Date(a.checkoutAt).toLocaleString()}
                                    </p>
                                  )}
                                </>
                              )}
                            </TableCell>
                          </>
                        ) : (
                              <>
                                <TableCell>
                                  <Select
                                    disabled={bookingKey === bookKey}
                                    onValueChange={(v) => void handleBookOnSelect(req, group, v)}
                                  >
                                    <SelectTrigger className="h-8 max-w-md rounded-[6px] text-xs">
                                      <SelectValue
                                        placeholder={
                                          bookingKey === bookKey
                                            ? 'Booking…'
                                            : 'Select asset or unavailable…'
                                        }
                                      />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value={UNAVAILABLE_PICK}>
                                        Unavailable (no asset in pool)
                                      </SelectItem>
                                      {options.map((poolAsset) => (
                                        <SelectItem
                                          key={`${poolAsset.kind}-${poolAsset.assetId}`}
                                          value={`${poolAsset.kind}:${poolAsset.assetId}`}
                                        >
                                          {poolAssetLabel(poolAsset)}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </TableCell>
                                <TableCell>
                                  <span className="text-xs text-muted-foreground">Unassigned</span>
                                </TableCell>
                              </>
                        )}
                      </TableRow>
                    );
                  });
                })}
              </TableBody>
            </Table>
          </div>

          {pool.length === 0 && (
            <p className="mt-3 flex items-center gap-2 text-xs text-amber-700">
              No assets available in the request pool.{' '}
              <Link to="/technician/request-assets" className="underline">
                Add assets first
              </Link>
            </p>
          )}

          <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
            {awaitingReturn.length > 0 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5 rounded-[8px]"
                onClick={() => openReturnForm(req)}
              >
                Return request ({awaitingReturn.length})
              </Button>
            )}
            {toCheckout.length > 0 && (
              <Button
                type="button"
                size="sm"
                className="gap-1.5 rounded-[8px]"
                disabled={checkoutRequestId === req.requestId}
                onClick={() => void handleCheckoutRequest(req)}
              >
                {checkoutRequestId === req.requestId
                  ? 'Checking out…'
                  : `Checkout request (${toCheckout.length})`}
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5 rounded-[8px] border-rose-200 text-rose-700 hover:bg-rose-50 dark:border-rose-900 dark:text-rose-300 dark:hover:bg-rose-950"
              onClick={() => {
                setRejectRequestId(req.requestId);
                setRejectReason('');
              }}
            >
              <XCircle className="h-3.5 w-3.5" />
              Reject request
            </Button>
          </div>
        </CollapsibleContent>
      </Collapsible>
    );
  };

  return (
    <TechnicianShell>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">User requests</h1>
          <p className="mt-1 max-w-xl text-xs text-muted-foreground sm:text-sm">
            Book assets or mark slots unavailable, then checkout or return the whole request.
          </p>
        </div>
        <Button variant="outline" size="sm" className="shrink-0 gap-1.5 rounded-[8px]" asChild>
          <Link to="/technician/request-assets">
            Request pool
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>

      <div className="relative mb-4 w-full sm:max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search requests…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-9 rounded-[8px] pl-9"
        />
      </div>

      <Card className="mb-4 rounded-[14px] border-border shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Pending requests</CardTitle>
          <CardDescription>
            {pool.length} asset{pool.length === 1 ? '' : 's'} in pool (status {REQUEST_STATUS_ACTIVE})
            · <span className="font-medium">Checkout request</span> checks out all booked assets ·{' '}
            <span className="font-medium">Return request</span> when items are checked out
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>
          ) : filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No pending user requests.</p>
          ) : (
            filtered.map((req) => renderRequestCollapsible(req))
          )}
        </CardContent>
      </Card>

      <Dialog
        open={returnRequest != null}
        onOpenChange={(open) => {
          if (!open) {
            setReturnRequest(null);
            setReturnRemarks('');
          }
        }}
      >
        <DialogContent className="rounded-[14px] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Return request</DialogTitle>
            <DialogDescription>
              {returnRequest
                ? `Request #${returnRequest.requestId} — ${returnRequest.requesterName}. Returns all checked-out assets (${checkedOutAwaitingReturn(returnRequest).length}) to the pool (status ${REQUEST_STATUS_ACTIVE}).`
                : ''}
            </DialogDescription>
          </DialogHeader>
          <RequestReturnFields
            returnCondition={returnCondition}
            setReturnCondition={setReturnCondition}
            remarks={returnRemarks}
            setRemarks={setReturnRemarks}
          />
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              className="rounded-[8px]"
              onClick={() => setReturnRequest(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="rounded-[8px]"
              disabled={returning}
              onClick={() => void handleReturnSubmit()}
            >
              {returning ? 'Returning…' : 'Confirm return'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={rejectRequestId != null}
        onOpenChange={(open) => {
          if (!open) {
            setRejectRequestId(null);
            setRejectReason('');
          }
        }}
      >
        <DialogContent className="rounded-[14px] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reject request</DialogTitle>
            <DialogDescription>
              This will reject the request and return any booked (status {REQUEST_STATUS_BOOKED}) assets
              to the pool.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="reject-reason">Rejection remarks</Label>
            <Textarea
              id="reject-reason"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Reason for rejection…"
              className="min-h-[88px] rounded-[8px]"
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              className="rounded-[8px]"
              onClick={() => setRejectRequestId(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="rounded-[8px]"
              disabled={rejecting}
              onClick={() => void handleReject()}
            >
              {rejecting ? 'Rejecting…' : 'Reject request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TechnicianShell>
  );
}
