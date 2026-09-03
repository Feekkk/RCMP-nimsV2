import { useMemo, useState } from 'react';
import { History, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
import { DisposalUnitShell } from '@/disposal-unit/disposal-unit-shell';
import { isoToLocalDate, localDateToIso } from '@shared/lib/date-format';
import { cn } from '@/lib/utils';
import { DatePickerField } from '@/technician/deploy-return-fields';

type HistoryRow = {
  id: string;
  assetLabel: string;
  category: string;
  serialNum: string;
  method: string;
  processedBy: string;
  disposedAt: string;
};

const HISTORY_ROWS: HistoryRow[] = [
  {
    id: '1',
    assetLabel: 'HP EliteDesk 800 G6',
    category: 'Laptop / Desktop',
    serialNum: '2UA0410XYZ',
    method: 'Recycled',
    processedBy: 'Nur Aisyah',
    disposedAt: '2026-08-02',
  },
  {
    id: '2',
    assetLabel: 'Lenovo ThinkPad T14',
    category: 'Laptop / Desktop',
    serialNum: 'PF3XK21L',
    method: 'Destroyed',
    processedBy: 'Ahmad Rizal',
    disposedAt: '2026-07-28',
  },
  {
    id: '3',
    assetLabel: 'Sony VPL-EX575',
    category: 'AV',
    serialNum: 'VPL-99102',
    method: 'Donated',
    processedBy: 'Siti Nurhaliza',
    disposedAt: '2026-07-15',
  },
  {
    id: '4',
    assetLabel: 'Netgear GS108',
    category: 'Network',
    serialNum: 'NG108-4411',
    method: 'Recycled',
    processedBy: 'Lim Wei Jie',
    disposedAt: '2026-06-30',
  },
  {
    id: '5',
    assetLabel: 'Dell OptiPlex 7080',
    category: 'Laptop / Desktop',
    serialNum: 'OP7080-1120',
    method: 'Destroyed',
    processedBy: 'Nur Aisyah',
    disposedAt: '2026-06-12',
  },
  {
    id: '6',
    assetLabel: 'JBL EON615 Speaker',
    category: 'AV',
    serialNum: 'JBL-EON-882',
    method: 'Sold',
    processedBy: 'Ahmad Rizal',
    disposedAt: '2026-05-20',
  },
];

function startOfDayMs(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

function endOfDayMs(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999).getTime();
}

function matchesDateFilter(isoDate: string, fromIso: string, toIso: string) {
  if (!fromIso && !toIso) return true;
  const event = isoToLocalDate(isoDate);
  if (!event) return false;
  const eventMs = event.getTime();
  if (fromIso) {
    const from = isoToLocalDate(fromIso);
    if (from && eventMs < startOfDayMs(from)) return false;
  }
  if (toIso) {
    const to = isoToLocalDate(toIso);
    if (to && eventMs > endOfDayMs(to)) return false;
  }
  return true;
}

function formatDate(value: string) {
  const date = isoToLocalDate(value);
  if (!date) return value;
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

export function DisposalUnitHistoryPage() {
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const dateRangeInvalid = useMemo(() => {
    if (!dateFrom || !dateTo) return false;
    const from = isoToLocalDate(dateFrom);
    const to = isoToLocalDate(dateTo);
    return Boolean(from && to && from > to);
  }, [dateFrom, dateTo]);

  const hasDateFilter = Boolean(dateFrom || dateTo);

  const filtered = useMemo(() => {
    if (dateRangeInvalid) return [];
    const q = search.trim().toLowerCase();
    return HISTORY_ROWS.filter((row) => {
      if (!matchesDateFilter(row.disposedAt, dateFrom, dateTo)) return false;
      if (!q) return true;
      return [row.assetLabel, row.category, row.serialNum, row.method, row.processedBy]
        .join(' ')
        .toLowerCase()
        .includes(q);
    });
  }, [search, dateFrom, dateTo, dateRangeInvalid]);

  return (
    <DisposalUnitShell>
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
      <div className="shrink-0">
        <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">History</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {filtered.length} record{filtered.length === 1 ? '' : 's'}
          {filtered.length !== HISTORY_ROWS.length ? ` of ${HISTORY_ROWS.length}` : ''}
          {' · '}
          Completed disposal activity
        </p>
      </div>

      <Card className="shrink-0 rounded-[14px] border-border shadow-sm">
        <CardContent className="space-y-4 p-4">
          <div className="min-w-0 max-w-sm">
            <Label className="mb-1.5 block text-xs text-muted-foreground">Search</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Asset, serial, method…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-10 rounded-[8px] pl-9"
              />
            </div>
          </div>

          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:gap-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="w-full sm:w-[220px]">
                <DatePickerField label="From date" value={dateFrom} onChange={setDateFrom} />
              </div>
              <div className="w-full sm:w-[220px]">
                <DatePickerField label="To date" value={dateTo} onChange={setDateTo} />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Quick range</Label>
              <div className="flex h-10 flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 rounded-[8px] px-3"
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
                  className="h-10 rounded-[8px] px-3"
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
                  className="h-10 rounded-[8px] px-3"
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
          </div>

          {dateRangeInvalid ? (
            <p className="text-xs text-destructive">End date must be on or after start date.</p>
          ) : null}
        </CardContent>
      </Card>

      <Card className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[14px] border-border shadow-sm">
        <CardContent className="min-h-0 flex-1 overflow-auto p-0">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-center">
              <History className="mb-2 h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">No disposal history matches your filters.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="h-11 px-4 sm:px-5">Asset</TableHead>
                  <TableHead className="h-11 px-4">Category</TableHead>
                  <TableHead className="h-11 px-4">Serial</TableHead>
                  <TableHead className="h-11 px-4">Method</TableHead>
                  <TableHead className="h-11 px-4">Processed by</TableHead>
                  <TableHead className="h-11 px-4 sm:px-5">Disposed on</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="px-4 py-3 font-medium text-foreground sm:px-5">
                      {row.assetLabel}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-muted-foreground">{row.category}</TableCell>
                    <TableCell className="px-4 py-3 font-mono text-xs text-muted-foreground">
                      {row.serialNum}
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <Badge
                        variant="outline"
                        className={cn(
                          'rounded-[6px] border-emerald-200 bg-emerald-50 font-semibold text-emerald-900',
                        )}
                      >
                        {row.method}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-4 py-3 text-muted-foreground">{row.processedBy}</TableCell>
                    <TableCell className="px-4 py-3 text-muted-foreground sm:px-5">
                      {formatDate(row.disposedAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      </div>
    </DisposalUnitShell>
  );
}
