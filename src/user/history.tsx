import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { ChevronDown, Package } from 'lucide-react';
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
            Track booking and return progress for your requests. Specific equipment assigned is
            handled by technicians only.
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
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {req.borrowDate} → {req.returnDate} · {req.programType}
                        </p>
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
  const parts: string[] = [];
  if (item.returnedCount > 0) {
    parts.push(`${item.returnedCount}/${item.quantity} returned`);
  }
  if (item.checkedOutCount > 0) {
    parts.push(`${item.checkedOutCount} checked out`);
  }
  if (item.bookedCount > 0) {
    parts.push(`${item.bookedCount} booked`);
  }
  const pending = item.quantity - item.returnedCount - item.checkedOutCount - item.bookedCount;
  if (pending > 0 && parts.length === 0) {
    parts.push('Awaiting assignment');
  } else if (pending > 0) {
    parts.push(`${pending} still needed`);
  }

  const done = item.returnedCount >= item.quantity;

  return (
    <li className="rounded-[8px] border border-border/80 px-3 py-2">
      <div className="flex items-start justify-between gap-2">
        <span className="font-medium">{item.assetType}</span>
        <span className="shrink-0 text-muted-foreground">× {item.quantity}</span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        {parts.length > 0 ? parts.join(' · ') : 'No activity yet'}
      </p>
      {done && (
        <Badge variant="secondary" className="mt-1.5 rounded-[6px] text-[10px]">
          Complete
        </Badge>
      )}
    </li>
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
