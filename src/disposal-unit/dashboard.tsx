import { CheckCircle2, Clock3, Package, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { DisposalUnitShell } from '@/disposal-unit/disposal-unit-shell';
import { cn } from '@/lib/utils';

type DisposalStatus = 'pending' | 'processing' | 'disposed';

type DisposalQueueRow = {
  id: string;
  assetLabel: string;
  category: string;
  serialNum: string;
  status: DisposalStatus;
  submittedBy: string;
  submittedAt: string;
};

const STATUS_META: Record<
  DisposalStatus,
  { label: string; className: string }
> = {
  pending: {
    label: 'Pending',
    className: 'border-amber-200 bg-amber-50 text-amber-900',
  },
  processing: {
    label: 'Processing',
    className: 'border-sky-200 bg-sky-50 text-sky-900',
  },
  disposed: {
    label: 'Disposed',
    className: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  },
};

const QUEUE_ROWS: DisposalQueueRow[] = [
  {
    id: '1',
    assetLabel: 'Dell Latitude 5520',
    category: 'Laptop / Desktop',
    serialNum: 'DL5520-88421',
    status: 'pending',
    submittedBy: 'Ahmad Rizal',
    submittedAt: '2026-08-11',
  },
  {
    id: '2',
    assetLabel: 'Cisco Catalyst 2960',
    category: 'Network',
    serialNum: 'FCW2134L0AB',
    status: 'processing',
    submittedBy: 'Siti Nurhaliza',
    submittedAt: '2026-08-09',
  },
  {
    id: '3',
    assetLabel: 'Epson EB-X06 Projector',
    category: 'AV',
    serialNum: 'X06-77291',
    status: 'pending',
    submittedBy: 'Lim Wei Jie',
    submittedAt: '2026-08-08',
  },
  {
    id: '4',
    assetLabel: 'HP EliteDesk 800 G6',
    category: 'Laptop / Desktop',
    serialNum: '2UA0410XYZ',
    status: 'disposed',
    submittedBy: 'Nur Aisyah',
    submittedAt: '2026-08-02',
  },
  {
    id: '5',
    assetLabel: 'Ubiquiti UniFi AP AC Pro',
    category: 'Network',
    serialNum: 'FCEC1234ABCD',
    status: 'pending',
    submittedBy: 'Ahmad Rizal',
    submittedAt: '2026-08-01',
  },
];

function formatDate(value: string) {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

function CountCard({
  icon: Icon,
  label,
  value,
  hint,
  tint,
}: {
  icon: typeof Package;
  label: string;
  value: number;
  hint: string;
  tint: string;
}) {
  return (
    <div className="flex h-full flex-col gap-3 rounded-2xl border border-border bg-card p-4 transition-shadow hover:shadow-sm">
      <div className="flex items-center gap-3">
        <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px]', tint)}>
          <Icon className="h-5 w-5" />
        </div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      </div>
      <div>
        <p className="text-3xl font-bold tabular-nums tracking-tight text-foreground">{value}</p>
        <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>
      </div>
    </div>
  );
}

export function DisposalUnitDashboardPage() {
  const pending = QUEUE_ROWS.filter((row) => row.status === 'pending').length;
  const processing = QUEUE_ROWS.filter((row) => row.status === 'processing').length;
  const disposed = QUEUE_ROWS.filter((row) => row.status === 'disposed').length;
  const total = QUEUE_ROWS.length;

  const todayLabel = new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  }).format(new Date());

  return (
    <DisposalUnitShell>
      <div className="mb-5 sm:mb-6">
        <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">Dashboard</h1>
        <p className="text-xs text-muted-foreground sm:text-sm">
          {todayLabel} · Disposal queue overview
        </p>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <CountCard
          icon={Clock3}
          label="Pending"
          value={pending}
          hint="Awaiting disposal review"
          tint="bg-amber-100 text-amber-900"
        />
        <CountCard
          icon={Package}
          label="Processing"
          value={processing}
          hint="Currently being processed"
          tint="bg-sky-100 text-sky-900"
        />
        <CountCard
          icon={CheckCircle2}
          label="Disposed"
          value={disposed}
          hint="Completed disposal records"
          tint="bg-emerald-100 text-emerald-900"
        />
        <CountCard
          icon={Trash2}
          label="Total"
          value={total}
          hint="All queue entries"
          tint="bg-lavender/20 text-[oklch(0.45_0.12_290)]"
        />
      </div>

      <Card className="rounded-[14px] border-border shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 border-b border-border/70 px-4 py-3 sm:px-5">
          <div>
            <CardTitle className="text-base font-semibold tracking-tight">Disposal queue</CardTitle>
            <p className="mt-0.5 text-xs text-muted-foreground">{QUEUE_ROWS.length} assets listed</p>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {QUEUE_ROWS.length === 0 ? (
            <div className="px-4 py-12 text-center text-sm text-muted-foreground sm:px-5">
              No assets in the disposal queue.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="h-11 px-4 sm:px-5">Asset</TableHead>
                  <TableHead className="h-11 px-4">Category</TableHead>
                  <TableHead className="h-11 px-4">Serial</TableHead>
                  <TableHead className="h-11 px-4">Status</TableHead>
                  <TableHead className="h-11 px-4">Submitted by</TableHead>
                  <TableHead className="h-11 px-4 sm:px-5">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {QUEUE_ROWS.map((row) => {
                  const status = STATUS_META[row.status];
                  return (
                    <TableRow key={row.id}>
                      <TableCell className="px-4 py-3 font-medium text-foreground sm:px-5">
                        {row.assetLabel}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-muted-foreground">{row.category}</TableCell>
                      <TableCell className="px-4 py-3 font-mono text-xs text-muted-foreground">
                        {row.serialNum}
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        <Badge variant="outline" className={cn('rounded-[6px] font-semibold', status.className)}>
                          {status.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-muted-foreground">{row.submittedBy}</TableCell>
                      <TableCell className="px-4 py-3 text-muted-foreground sm:px-5">
                        {formatDate(row.submittedAt)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </DisposalUnitShell>
  );
}
