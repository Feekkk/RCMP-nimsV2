import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Ban, ChevronDown, Package, UserX } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Toaster } from '@/components/ui/sonner';
import { clearAllSessions, readUserSession } from '@/lib/auth-session';
import type { UserRequestHistory, UserRequestItemProgress } from '@/lib/request-schema';
import { listUserRequestHistoryFn } from '@/server/request.functions';
import { UserPageChrome } from '@/user/user-chrome';
import { cn } from '@/lib/utils';

function itemResolvedUnits(item: UserRequestItemProgress): number {
  return (
    item.bookedCount +
    item.checkedOutCount +
    item.returnedCount +
    item.unavailableCount +
    item.notTakenCount
  );
}

function itemPendingUnits(item: UserRequestItemProgress): number {
  return Math.max(0, item.quantity - itemResolvedUnits(item));
}

function summarizeRequestItems(items: UserRequestItemProgress[]) {
  return items.reduce(
    (acc, item) => {
      acc.booked += item.bookedCount;
      acc.checkedOut += item.checkedOutCount;
      acc.returned += item.returnedCount;
      acc.unavailable += item.unavailableCount;
      acc.notTaken += item.notTakenCount;
      acc.pending += itemPendingUnits(item);
      return acc;
    },
    { booked: 0, checkedOut: 0, returned: 0, unavailable: 0, notTaken: 0, pending: 0 },
  );
}

export function UserRequestHistoryPage() {
  const navigate = useNavigate();
  const [session, setSession] = useState(readUserSession);
  const [requests, setRequests] = useState<UserRequestHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<number | null>(null);

  const load = useCallback(async (staffId: string) => {
    setLoading(true);
    try {
      const rows = await listUserRequestHistoryFn({ data: { staffId } });
      setRequests(rows);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load history');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const user = readUserSession();
    if (!user) {
      void navigate({ to: '/login' });
      return;
    }
    setSession(user);
    void load(user.staffId);
  }, [navigate, load]);

  const handleSignOut = () => {
    clearAllSessions();
    void navigate({ to: '/login' });
  };

  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-background">
      <UserPageChrome session={session} onSignOut={handleSignOut} active="history" />

      <main className="mx-auto max-w-2xl px-4 py-6 sm:py-8">
        <div className="mb-6">
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Request history</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Track booking, checkout, return, and technician updates for your requests.
          </p>
        </div>

        <Card className="rounded-[16px] border-border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">All requests</CardTitle>
            <CardDescription>{requests.length} total</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <p className="py-10 text-center text-sm text-muted-foreground">Loading…</p>
            ) : requests.length === 0 ? (
              <div className="rounded-[12px] border border-dashed border-border py-12 text-center">
                <Package className="mx-auto mb-2 h-8 w-8 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">No requests yet.</p>
              </div>
            ) : (
              requests.map((req) => {
                const isOpen = openId === req.requestId;
                const summary = summarizeRequestItems(req.items);

                return (
                  <Collapsible
                    key={req.requestId}
                    open={isOpen}
                    onOpenChange={(open) => setOpenId(open ? req.requestId : null)}
                    className="rounded-[12px] border border-border"
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
                          <span className="font-semibold">Request #{req.requestId}</span>
                          <StatusBadge status={req.status} />
                          {summary.unavailable > 0 && (
                            <MiniCountBadge
                              icon={Ban}
                              label={`${summary.unavailable} unavailable`}
                              className="border-amber-200 bg-amber-50 text-amber-800"
                            />
                          )}
                          {summary.notTaken > 0 && (
                            <MiniCountBadge
                              icon={UserX}
                              label={`${summary.notTaken} not collected`}
                              className="border-rose-200 bg-rose-50 text-rose-800"
                            />
                          )}
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {req.borrowDate} → {req.returnDate} · {req.programType}
                        </p>
                        {!isOpen && summary.pending > 0 && (
                          <p className="mt-1 text-[11px] text-muted-foreground">
                            {summary.pending} unit{summary.pending === 1 ? '' : 's'} awaiting technician
                            action
                          </p>
                        )}
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="border-t border-border px-4 py-3 text-sm">
                      <dl className="space-y-2">
                        <Row label="Location" value={req.usageLocation} />
                        {req.reason && <Row label="Reason" value={req.reason} />}
                        {req.status === 'rejected' && req.rejectionReason && (
                          <Row label="Rejection reason" value={req.rejectionReason} />
                        )}
                        <Row
                          label="Submitted"
                          value={req.createdAt ? new Date(req.createdAt).toLocaleString() : '—'}
                        />
                      </dl>

                      {(summary.unavailable > 0 || summary.notTaken > 0) && (
                        <div className="mt-4 rounded-[10px] border border-border/80 bg-muted/25 px-3 py-2.5 text-xs text-muted-foreground">
                          <p className="font-medium text-foreground">Technician updates</p>
                          {summary.unavailable > 0 && (
                            <p className="mt-1">
                              <span className="font-medium text-amber-800">Unavailable</span> — no
                              matching equipment could be assigned for {summary.unavailable} unit
                              {summary.unavailable === 1 ? '' : 's'}.
                            </p>
                          )}
                          {summary.notTaken > 0 && (
                            <p className="mt-1">
                              <span className="font-medium text-rose-800">Not collected</span> —{' '}
                              {summary.notTaken} booked unit
                              {summary.notTaken === 1 ? ' was' : 's were'} not picked up and
                              released back to inventory.
                            </p>
                          )}
                        </div>
                      )}

                      <p className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Progress by category
                      </p>
                      <ul className="space-y-2">
                        {req.items.map((item) => (
                          <ItemProgressCard key={item.requestItemId} item={item} />
                        ))}
                      </ul>
                    </CollapsibleContent>
                  </Collapsible>
                );
              })
            )}
          </CardContent>
        </Card>
      </main>
      <Toaster />
    </div>
  );
}

function ItemProgressCard({ item }: { item: UserRequestItemProgress }) {
  const pending = itemPendingUnits(item);
  const done = item.returnedCount >= item.quantity;
  const closedWithoutFulfillment =
    item.returnedCount === 0 &&
    item.checkedOutCount === 0 &&
    item.bookedCount === 0 &&
    item.unavailableCount + item.notTakenCount >= item.quantity;

  return (
    <li className="rounded-[10px] border border-border/80 px-3 py-2.5">
      <div className="flex items-start justify-between gap-2">
        <span className="font-medium">{item.assetType}</span>
        <span className="shrink-0 text-muted-foreground">× {item.quantity}</span>
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5">
        {item.bookedCount > 0 && (
          <ProgressChip
            label="Booked"
            count={item.bookedCount}
            className="border-violet-200 bg-violet-50 text-violet-800"
          />
        )}
        {item.checkedOutCount > 0 && (
          <ProgressChip
            label="Checked out"
            count={item.checkedOutCount}
            className="border-sky-200 bg-sky-50 text-sky-800"
          />
        )}
        {item.returnedCount > 0 && (
          <ProgressChip
            label="Returned"
            count={item.returnedCount}
            className="border-emerald-200 bg-emerald-50 text-emerald-800"
          />
        )}
        {item.unavailableCount > 0 && (
          <ProgressChip
            label="Unavailable"
            count={item.unavailableCount}
            className="border-amber-200 bg-amber-50 text-amber-800"
          />
        )}
        {item.notTakenCount > 0 && (
          <ProgressChip
            label="Not collected"
            count={item.notTakenCount}
            className="border-rose-200 bg-rose-50 text-rose-800"
          />
        )}
        {pending > 0 && (
          <ProgressChip
            label="Awaiting assignment"
            count={pending}
            className="border-border bg-muted/50 text-muted-foreground"
          />
        )}
      </div>

      {done && (
        <Badge variant="secondary" className="mt-2 rounded-[6px] text-[10px]">
          Complete
        </Badge>
      )}
      {closedWithoutFulfillment && !done && (
        <p className="mt-2 text-[11px] text-muted-foreground">
          No equipment was issued for this category.
        </p>
      )}
    </li>
  );
}

function ProgressChip({
  label,
  count,
  className,
}: {
  label: string;
  count: number;
  className: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-[6px] border px-2 py-0.5 text-[10px] font-medium',
        className,
      )}
    >
      {label}
      <span className="tabular-nums">× {count}</span>
    </span>
  );
}

function MiniCountBadge({
  icon: Icon,
  label,
  className,
}: {
  icon: typeof Ban;
  label: string;
  className: string;
}) {
  return (
    <Badge variant="outline" className={cn('gap-1 rounded-[6px] text-[10px]', className)}>
      <Icon className="h-3 w-3" aria-hidden />
      {label}
    </Badge>
  );
}

function StatusBadge({ status }: { status: UserRequestHistory['status'] }) {
  switch (status) {
    case 'rejected':
      return (
        <Badge variant="destructive" className="rounded-[6px] text-[10px]">
          Rejected
        </Badge>
      );
    case 'completed':
      return (
        <Badge variant="default" className="rounded-[6px] text-[10px]">
          Completed
        </Badge>
      );
    case 'unavailable':
      return (
        <Badge
          variant="outline"
          className="rounded-[6px] border-amber-200 bg-amber-50 text-[10px] text-amber-800"
        >
          Unavailable
        </Badge>
      );
    case 'in_use':
      return (
        <Badge
          variant="outline"
          className="rounded-[6px] border-sky-200 bg-sky-50 text-[10px] text-sky-800"
        >
          Checked out
        </Badge>
      );
    case 'preparing':
      return (
        <Badge
          variant="outline"
          className="rounded-[6px] border-violet-200 bg-violet-50 text-[10px] text-violet-800"
        >
          Being prepared
        </Badge>
      );
    default:
      return (
        <Badge
          variant="outline"
          className="rounded-[6px] border-amber-200 bg-amber-50 text-[10px] text-amber-800"
        >
          Submitted
        </Badge>
      );
  }
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
