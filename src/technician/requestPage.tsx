import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import {
  AlertTriangle,
  ArrowRight,
  Ban,
  ChevronDown,
  ClipboardList,
  Laptop,
  Loader2,
  PackageCheck,
  RotateCcw,
  Search,
  Tv,
  UserX,
  XCircle,
} from 'lucide-react';
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
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
  RequestSlotMark,
} from '@/lib/request-schema';
import { kindGroupLabel, requestItemKindFromAssetType } from '@/lib/request-asset-types';
import { formatDateLabel, isoToLocalDate, localDateToIso } from '@/lib/date-format';
import { cn } from '@/lib/utils';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { AssetStatusBadge } from '@/technician/asset-status-badge';
import { TechnicianShell } from '@/technician/technician-shell';
import { sendCheckoutEmailFn } from '@/server/checkout-email.functions';
import { sendRequestRejectEmailFn } from '@/server/request-reject-email.functions';
import { sendRequestReturnEmailFn } from '@/server/request-return-email.functions';
import {
  bookPoolAssetToRequestFn,
  cancelBookedAssignmentNotTakenFn,
  changeBookedAssignmentFn,
  checkoutUserRequestFn,
  listAvailablePoolAssetsFn,
  listPendingRequestsFn,
  markRequestSlotNotTakenFn,
  markRequestSlotUnavailableFn,
  rejectUserRequestFn,
  returnUserRequestFn,
} from '@/server/request.functions';
import { RequestReturnFields } from '@/technician/request-return-fields';

function poolAssetLabel(a: RequestPoolAsset): string {
  const kind = a.kind === 'laptop' ? 'Laptop' : 'AV';
  const parts = [kind, `#${a.assetId}`, a.model, a.brand, a.category].filter(Boolean);
  return parts.join(' · ');
}

function slotMarkLabel(mark: RequestSlotMark): string {
  return mark === 'not_taken' ? 'Not taken' : 'Unavailable';
}

function bookedAssetLabel(a: RequestAssignmentRow): string {
  if (a.slotMark) return slotMarkLabel(a.slotMark);
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

type RequestViewFilter = 'all' | 'pending' | 'to_return' | 'overdue';

function todayIso(): string {
  return localDateToIso(new Date());
}

function requestHasToReturn(req: PendingRequest): boolean {
  return checkedOutAwaitingReturn(req).length > 0;
}

function requestCanReject(req: PendingRequest): boolean {
  return !req.assignments.some((a) => a.checkoutAt != null);
}

function requestIsOverdue(req: PendingRequest): boolean {
  return requestHasToReturn(req) && req.returnDate < todayIso();
}

function emptySlotCount(req: PendingRequest): number {
  let count = 0;
  for (const group of kindGroupsForRequest(req)) {
    count += linesForKindGroup(req, group).filter((line) => line.lineKind === 'empty').length;
  }
  return count;
}

function requestIsPending(req: PendingRequest): boolean {
  if (bookedAwaitingCheckout(req).length > 0) return true;
  return emptySlotCount(req) > 0;
}

function daysUntilReturn(req: PendingRequest): number | null {
  if (!requestHasToReturn(req)) return null;
  const today = isoToLocalDate(todayIso());
  const returnDay = isoToLocalDate(req.returnDate);
  if (!today || !returnDay) return null;
  return Math.round((returnDay.getTime() - today.getTime()) / 86_400_000);
}

type RequestQueues = {
  overdue: PendingRequest[];
  toReturn: PendingRequest[];
  pending: PendingRequest[];
};

function classifyRequests(requests: PendingRequest[]): RequestQueues {
  const overdue: PendingRequest[] = [];
  const toReturn: PendingRequest[] = [];
  const pending: PendingRequest[] = [];

  for (const req of requests) {
    if (requestIsOverdue(req)) overdue.push(req);
    if (requestHasToReturn(req)) toReturn.push(req);
    if (requestIsPending(req)) pending.push(req);
  }

  overdue.sort((a, b) => a.returnDate.localeCompare(b.returnDate));
  toReturn.sort((a, b) => a.returnDate.localeCompare(b.returnDate));
  pending.sort((a, b) => a.borrowDate.localeCompare(b.borrowDate));

  return { overdue, toReturn, pending };
}

function matchesSearch(req: PendingRequest, query: string): boolean {
  if (!query) return true;
  return [
    String(req.requestId),
    req.requesterName,
    req.requestedBy,
    req.programType,
    req.usageLocation,
    req.reason,
    ...req.items.map((i) => i.assetType),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
    .includes(query);
}

export function TechnicianRequestPage() {
  const [requests, setRequests] = useState<PendingRequest[]>([]);
  const [pool, setPool] = useState<RequestPoolAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [viewFilter, setViewFilter] = useState<RequestViewFilter>('all');
  const [openId, setOpenId] = useState<number | null>(null);
  const [actionKey, setActionKey] = useState<string | null>(null);
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

  const searched = useMemo(() => {
    const q = search.trim().toLowerCase();
    return requests.filter((r) => matchesSearch(r, q));
  }, [requests, search]);

  const queues = useMemo(() => classifyRequests(searched), [searched]);

  const displayed = useMemo(() => {
    switch (viewFilter) {
      case 'overdue':
        return queues.overdue;
      case 'to_return':
        return queues.toReturn;
      case 'pending':
        return queues.pending;
      default:
        return searched;
    }
  }, [viewFilter, searched, queues]);

  const resolveBookingItem = (req: PendingRequest, group: KindGroup) => {
    const item = findItemForBooking(req, group);
    if (!item) {
      toast.error('All slots are filled for this category');
      return null;
    }
    const session = readTechnicianSession();
    if (!session?.staffId) {
      toast.error('Technician session required');
      return null;
    }
    return { item, staffId: session.staffId };
  };

  const handleBookOnSelect = async (req: PendingRequest, group: KindGroup, pick: string) => {
    if (!pick || pick === '_none') return;
    const resolved = resolveBookingItem(req, group);
    if (!resolved) return;

    const [kind, idStr] = pick.split(':');
    const assetId = Number(idStr);
    if ((kind !== 'laptop' && kind !== 'av') || Number.isNaN(assetId)) return;
    if (kind !== group.kind) return;

    const key = `book-${req.requestId}-${group.kind}`;
    setActionKey(key);
    try {
      await bookPoolAssetToRequestFn({
        data: {
          requestId: req.requestId,
          requestItemId: resolved.item.requestItemId,
          kind,
          assetId,
          assignedBy: resolved.staffId,
          remarks: null,
        },
      });
      toast.success(`Booked ${kind} #${assetId} (status ${REQUEST_STATUS_BOOKED})`);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Booking failed');
    } finally {
      setActionKey(null);
    }
  };

  const handleMarkUnavailable = async (req: PendingRequest, group: KindGroup) => {
    const resolved = resolveBookingItem(req, group);
    if (!resolved) return;

    const key = `unavail-${req.requestId}-${group.kind}`;
    setActionKey(key);
    try {
      await markRequestSlotUnavailableFn({
        data: {
          requestId: req.requestId,
          requestItemId: resolved.item.requestItemId,
          markedBy: resolved.staffId,
          remarks: null,
        },
      });
      toast.success(`${group.label} slot marked unavailable`);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not mark unavailable');
    } finally {
      setActionKey(null);
    }
  };

  const handleMarkNotTaken = async (req: PendingRequest, group: KindGroup) => {
    const resolved = resolveBookingItem(req, group);
    if (!resolved) return;

    const key = `nottaken-${req.requestId}-${group.kind}`;
    setActionKey(key);
    try {
      await markRequestSlotNotTakenFn({
        data: {
          requestId: req.requestId,
          requestItemId: resolved.item.requestItemId,
          markedBy: resolved.staffId,
        },
      });
      toast.success(`${group.label} slot marked not taken`);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not mark not taken');
    } finally {
      setActionKey(null);
    }
  };

  const handleBookedNotTaken = async (assignment: RequestAssignmentRow) => {
    const session = readTechnicianSession();
    if (!session?.staffId) {
      toast.error('Technician session required');
      return;
    }

    const key = `cancel-${assignment.assignmentId}`;
    setActionKey(key);
    try {
      await cancelBookedAssignmentNotTakenFn({
        data: { assignmentId: assignment.assignmentId, cancelledBy: session.staffId },
      });
      toast.success('Booking released — asset returned to pool');
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not mark not taken');
    } finally {
      setActionKey(null);
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
      try {
        await sendCheckoutEmailFn({
          data: {
            requestId: req.requestId,
            checkedOutBy: session.staffId,
            assignmentIds: result.assignmentIds,
          },
        });
        toast.success(
          `Checked out ${result.checkedOut} asset${result.checkedOut === 1 ? '' : 's'} — notification sent to requester`,
        );
      } catch (emailErr) {
        toast.success(
          `Checked out ${result.checkedOut} asset${result.checkedOut === 1 ? '' : 's'} (status ${REQUEST_STATUS_CHECKOUT})`,
        );
        toast.warning(
          emailErr instanceof Error
            ? emailErr.message
            : 'Checkout saved but notification email could not be sent',
        );
      }
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
      try {
        await sendRequestRejectEmailFn({ data: rejectRequestId });
        toast.success('Request rejected — notification sent to requester');
      } catch (emailErr) {
        toast.success('Request rejected');
        toast.warning(
          emailErr instanceof Error
            ? emailErr.message
            : 'Request rejected but notification email could not be sent',
        );
      }
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
      try {
        await sendRequestReturnEmailFn({
          data: {
            requestId: returnRequest.requestId,
            returnedBy: session.staffId,
            assignmentIds: result.assignmentIds,
            returnCondition: condition,
            remarks: returnRemarks.trim() || null,
          },
        });
        toast.success(
          `Returned ${result.returned} asset${result.returned === 1 ? '' : 's'} — notification sent to requester`,
        );
      } catch (emailErr) {
        toast.success(
          `Returned ${result.returned} asset${result.returned === 1 ? '' : 's'} to the request pool`,
        );
        toast.warning(
          emailErr instanceof Error
            ? emailErr.message
            : 'Return saved but notification email could not be sent',
        );
      }
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
    const overdue = requestIsOverdue(req);
    const pending = requestIsPending(req);
    const emptySlots = emptySlotCount(req);
    const daysLeft = daysUntilReturn(req);

    return (
      <Collapsible
        key={req.requestId}
        open={isOpen}
        onOpenChange={(open) => setOpenId(open ? req.requestId : null)}
        className={cn(
          'rounded-[12px] border',
          overdue
            ? 'border-rose-300 bg-rose-50/40 dark:border-rose-900 dark:bg-rose-950/20'
            : 'border-border',
        )}
      >
        <CollapsibleTrigger className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-secondary/40">
          <ChevronDown
            className={cn(
              'mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform',
              isOpen && 'rotate-180',
            )}
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold">{req.requesterName}</span>
              <Badge variant="outline" className="rounded-[6px] text-[10px] tabular-nums">
                #{req.requestId}
              </Badge>
              {overdue && (
                <Badge
                  variant="outline"
                  className="gap-1 rounded-[6px] border-rose-300 bg-rose-100 text-[10px] text-rose-800 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-200"
                >
                  <AlertTriangle className="h-3 w-3" aria-hidden />
                  Overdue
                </Badge>
              )}
              {awaitingReturn.length > 0 && !overdue && (
                <Badge
                  variant="outline"
                  className="rounded-[6px] border-sky-200 bg-sky-50 text-[10px] text-sky-800"
                >
                  {awaitingReturn.length} to return
                </Badge>
              )}
              {toCheckout.length > 0 && (
                <Badge
                  variant="outline"
                  className="rounded-[6px] border-violet-200 bg-violet-50 text-[10px] text-violet-800"
                >
                  {toCheckout.length} ready to checkout
                </Badge>
              )}
              {emptySlots > 0 && (
                <Badge variant="outline" className="rounded-[6px] text-[10px] tabular-nums">
                  {emptySlots} slot{emptySlots === 1 ? '' : 's'} open
                </Badge>
              )}
              {totalReturned > 0 && (
                <Badge variant="secondary" className="rounded-[6px] text-[10px] tabular-nums">
                  {totalReturned} returned
                </Badge>
              )}
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {formatDateLabel(req.borrowDate)} → {formatDateLabel(req.returnDate)} ·{' '}
              {req.programType} · {req.usageLocation}
            </p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {totalCheckedOut}/{totalNeeded} checked out
              {daysLeft != null &&
                (overdue
                  ? ` · ${Math.abs(daysLeft)} day${Math.abs(daysLeft) === 1 ? '' : 's'} overdue`
                  : daysLeft === 0
                    ? ' · due today'
                    : ` · ${daysLeft} day${daysLeft === 1 ? '' : 's'} until return`)}
              {pending && !awaitingReturn.length && emptySlots === 0 && toCheckout.length === 0
                ? ' · awaiting action'
                : ''}
            </p>
          </div>
          <div
            className="flex shrink-0 flex-wrap items-center gap-1.5"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            {awaitingReturn.length > 0 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={cn(
                  'h-8 rounded-[8px] text-xs',
                  overdue && 'border-rose-300 text-rose-800 hover:bg-rose-100',
                )}
                onClick={() => openReturnForm(req)}
              >
                <RotateCcw className="mr-1 h-3.5 w-3.5" />
                Return
              </Button>
            )}
            {toCheckout.length > 0 && (
              <Button
                type="button"
                size="sm"
                className="h-8 rounded-[8px] text-xs"
                disabled={checkoutRequestId === req.requestId}
                onClick={() => void handleCheckoutRequest(req)}
              >
                {checkoutRequestId === req.requestId ? 'Checking out…' : 'Checkout'}
              </Button>
            )}
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent className="border-t border-border px-4 py-4">
          {req.reason && (
            <p className="mb-3 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Reason:</span> {req.reason}
            </p>
          )}

          <div className="rounded-[10px] border border-border">
            <Table className="table-fixed">
              <colgroup>
                <col className="w-[26%]" />
                <col className="w-[34%]" />
                <col className="w-[22%]" />
                <col className="w-[18%]" />
              </colgroup>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Category</TableHead>
                  <TableHead>Asset</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {kindGroupsForRequest(req).flatMap((group) => {
                  const lines = linesForKindGroup(req, group);
                  const checkedOut = checkedOutCountForGroup(req, group);
                  const options = optionsForKind(group.kind);
                  const bookKey = `book-${req.requestId}-${group.kind}`;
                  const unavailKey = `unavail-${req.requestId}-${group.kind}`;
                  const notTakenKey = `nottaken-${req.requestId}-${group.kind}`;

                  if (lines.length === 0) return [];

                  return lines.map((line, lineIdx) => {
                    const rowKey =
                      line.lineKind === 'assignment'
                        ? `a-${line.assignment.assignmentId}`
                        : `e-${group.kind}-${lineIdx}`;
                    const a = line.lineKind === 'assignment' ? line.assignment : null;
                    const isCheckedOut = a?.checkoutAt != null;
                    const isBookedAwaitingCheckout =
                      a != null &&
                      !a.unavailable &&
                      !isCheckedOut &&
                      a.assetStatusId === REQUEST_STATUS_BOOKED;

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
                              {a.slotMark ? (
                                <span
                                  className={cn(
                                    'text-sm font-medium',
                                    a.slotMark === 'not_taken'
                                      ? 'text-muted-foreground'
                                      : 'text-amber-800 dark:text-amber-200',
                                  )}
                                >
                                  {slotMarkLabel(a.slotMark)}
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
                              {a.slotMark ? (
                                <Badge variant="outline" className="rounded-[6px] text-[10px]">
                                  {slotMarkLabel(a.slotMark)}
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
                            <TableCell>
                              {isBookedAwaitingCheckout ? (
                                <TooltipProvider delayDuration={300}>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="icon"
                                        className="h-8 w-8 shrink-0 rounded-[8px]"
                                        disabled={actionKey === `cancel-${a.assignmentId}`}
                                        aria-label="Not taken"
                                        onClick={() => void handleBookedNotTaken(a)}
                                      >
                                        {actionKey === `cancel-${a.assignmentId}` ? (
                                          <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                          <UserX className="h-4 w-4" />
                                        )}
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent side="top">Not taken</TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </TableCell>
                          </>
                        ) : (
                          <>
                            <TableCell>
                              <Select
                                disabled={actionKey === bookKey}
                                onValueChange={(v) => void handleBookOnSelect(req, group, v)}
                              >
                                <SelectTrigger className="h-8 max-w-md rounded-[6px] text-xs">
                                  <SelectValue
                                    placeholder={
                                      actionKey === bookKey ? 'Booking…' : 'Select asset…'
                                    }
                                  />
                                </SelectTrigger>
                                <SelectContent>
                                  {options.length === 0 ? (
                                    <SelectItem value="_none" disabled>
                                      No assets in pool
                                    </SelectItem>
                                  ) : (
                                    options.map((poolAsset) => (
                                      <SelectItem
                                        key={`${poolAsset.kind}-${poolAsset.assetId}`}
                                        value={`${poolAsset.kind}:${poolAsset.assetId}`}
                                      >
                                        {poolAssetLabel(poolAsset)}
                                      </SelectItem>
                                    ))
                                  )}
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              <span className="text-xs text-muted-foreground">Unassigned</span>
                            </TableCell>
                            <TableCell>
                              <TooltipProvider delayDuration={300}>
                                <div className="flex items-center gap-1">
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="icon"
                                        className="h-8 w-8 shrink-0 rounded-[8px]"
                                        disabled={actionKey != null}
                                        aria-label="Unavailable"
                                        onClick={() => void handleMarkUnavailable(req, group)}
                                      >
                                        {actionKey === unavailKey ? (
                                          <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                          <Ban className="h-4 w-4" />
                                        )}
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent side="top">Unavailable</TooltipContent>
                                  </Tooltip>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="icon"
                                        className="h-8 w-8 shrink-0 rounded-[8px]"
                                        disabled={actionKey != null}
                                        aria-label="Not taken"
                                        onClick={() => void handleMarkNotTaken(req, group)}
                                      >
                                        {actionKey === notTakenKey ? (
                                          <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                          <UserX className="h-4 w-4" />
                                        )}
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent side="top">Not taken</TooltipContent>
                                  </Tooltip>
                                </div>
                              </TooltipProvider>
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
            {requestCanReject(req) && (
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
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    );
  };

  const toReturnNotOverdue = useMemo(
    () => queues.toReturn.filter((req) => !requestIsOverdue(req)),
    [queues.toReturn],
  );

  const renderRequestList = (list: PendingRequest[], emptyMessage: string) => {
    if (list.length === 0) {
      return <p className="py-6 text-center text-sm text-muted-foreground">{emptyMessage}</p>;
    }
    return <div className="space-y-3">{list.map((req) => renderRequestCollapsible(req))}</div>;
  };

  const renderAllSections = () => {
    const hasAny =
      queues.overdue.length > 0 ||
      toReturnNotOverdue.length > 0 ||
      queues.pending.length > 0;

    if (!hasAny) {
      return (
        <p className="py-8 text-center text-sm text-muted-foreground">No pending user requests.</p>
      );
    }

    return (
      <div className="space-y-6">
        {queues.overdue.length > 0 && (
          <RequestQueueSection
            title="Overdue"
            description="Past return date — checked-out assets still outstanding"
            count={queues.overdue.length}
            tone="rose"
            icon={AlertTriangle}
          >
            {renderRequestList(queues.overdue, '')}
          </RequestQueueSection>
        )}
        {toReturnNotOverdue.length > 0 && (
          <RequestQueueSection
            title="Due for return"
            description="Checked out and within or before the return window"
            count={toReturnNotOverdue.length}
            tone="sky"
            icon={RotateCcw}
          >
            {renderRequestList(toReturnNotOverdue, '')}
          </RequestQueueSection>
        )}
        {queues.pending.length > 0 && (
          <RequestQueueSection
            title="Pending action"
            description="Book assets, mark slots, or checkout booked items"
            count={queues.pending.length}
            tone="violet"
            icon={ClipboardList}
          >
            {renderRequestList(queues.pending, '')}
          </RequestQueueSection>
        )}
      </div>
    );
  };

  return (
    <TechnicianShell>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">User requests</h1>
          <p className="mt-1 max-w-xl text-xs text-muted-foreground sm:text-sm">
            Work pending bookings, checkouts, returns, and overdue loans from one queue.
          </p>
        </div>
        <Button variant="outline" size="sm" className="shrink-0 gap-1.5 rounded-[8px]" asChild>
          <Link to="/technician/request-assets">
            Request pool
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <QueueStatCard
          label="Pending"
          count={queues.pending.length}
          icon={ClipboardList}
          active={viewFilter === 'pending'}
          onClick={() => setViewFilter('pending')}
          className="border-violet-200/80 bg-violet-50/50 dark:border-violet-900 dark:bg-violet-950/30"
        />
        <QueueStatCard
          label="To return"
          count={queues.toReturn.length}
          icon={PackageCheck}
          active={viewFilter === 'to_return'}
          onClick={() => setViewFilter('to_return')}
          className="border-sky-200/80 bg-sky-50/50 dark:border-sky-900 dark:bg-sky-950/30"
        />
        <QueueStatCard
          label="Overdue"
          count={queues.overdue.length}
          icon={AlertTriangle}
          active={viewFilter === 'overdue'}
          onClick={() => setViewFilter('overdue')}
          className="border-rose-200/80 bg-rose-50/50 dark:border-rose-900 dark:bg-rose-950/30"
        />
      </div>

      <Card className="mb-4 rounded-[14px] border-border shadow-sm">
        <CardHeader className="flex flex-col gap-3 pb-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-base">Request queue</CardTitle>
              <CardDescription>
                {searched.length} request{searched.length === 1 ? '' : 's'}
                {searched.length !== requests.length && ` of ${requests.length}`}
                {' · '}
                {pool.length} asset{pool.length === 1 ? '' : 's'} in pool
              </CardDescription>
            </div>
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search requests…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 rounded-[8px] pl-9"
              />
            </div>
          </div>
          <ToggleGroup
            type="single"
            value={viewFilter}
            onValueChange={(value) => {
              if (value) setViewFilter(value as RequestViewFilter);
            }}
            className="flex flex-wrap justify-start gap-1"
          >
            <ToggleGroupItem value="all" className="rounded-[8px] px-3 text-xs">
              All ({searched.length})
            </ToggleGroupItem>
            <ToggleGroupItem value="pending" className="gap-1.5 rounded-[8px] px-3 text-xs">
              <ClipboardList className="h-3.5 w-3.5" />
              Pending ({queues.pending.length})
            </ToggleGroupItem>
            <ToggleGroupItem value="to_return" className="gap-1.5 rounded-[8px] px-3 text-xs">
              <RotateCcw className="h-3.5 w-3.5" />
              To return ({queues.toReturn.length})
            </ToggleGroupItem>
            <ToggleGroupItem value="overdue" className="gap-1.5 rounded-[8px] px-3 text-xs">
              <AlertTriangle className="h-3.5 w-3.5" />
              Overdue ({queues.overdue.length})
            </ToggleGroupItem>
          </ToggleGroup>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>
          ) : viewFilter === 'all' ? (
            renderAllSections()
          ) : (
            renderRequestList(
              displayed,
              viewFilter === 'overdue'
                ? 'No overdue requests.'
                : viewFilter === 'to_return'
                  ? 'No requests awaiting return.'
                  : 'No requests need pending action.',
            )
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

function QueueStatCard({
  label,
  count,
  icon: Icon,
  active,
  onClick,
  className,
}: {
  label: string;
  count: number;
  icon: typeof ClipboardList;
  active: boolean;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-[12px] border p-4 text-left transition-colors hover:opacity-90',
        active && 'ring-2 ring-[oklch(0.45_0.12_290)]/40',
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <Icon className="h-4 w-4 text-muted-foreground" aria-hidden />
      </div>
      <p className="mt-1 text-2xl font-bold tabular-nums">{count}</p>
    </button>
  );
}

function RequestQueueSection({
  title,
  description,
  count,
  tone,
  icon: Icon,
  children,
}: {
  title: string;
  description: string;
  count: number;
  tone: 'rose' | 'sky' | 'violet';
  icon: typeof ClipboardList;
  children: ReactNode;
}) {
  const toneClass =
    tone === 'rose'
      ? 'border-rose-200 bg-rose-50/60 dark:border-rose-900 dark:bg-rose-950/30'
      : tone === 'sky'
        ? 'border-sky-200 bg-sky-50/60 dark:border-sky-900 dark:bg-sky-950/30'
        : 'border-violet-200 bg-violet-50/60 dark:border-violet-900 dark:bg-violet-950/30';

  return (
    <section className={cn('rounded-[12px] border px-4 py-3', toneClass)}>
      <div className="mb-3 flex items-start gap-2">
        <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
        <div>
          <h2 className="text-sm font-semibold">
            {title}{' '}
            <span className="font-normal text-muted-foreground">({count})</span>
          </h2>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      {children}
    </section>
  );
}
