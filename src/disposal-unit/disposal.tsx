import { useMemo, useState } from 'react';
import { Search, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
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
import { DisposalUnitShell } from '@/disposal-unit/disposal-unit-shell';
import { isoToLocalDate } from '@shared/lib/date-format';
import { cn } from '@/lib/utils';
import { DatePickerField } from '@/technician/deploy-return-fields';

type ProposedAsset = {
  id: string;
  assetLabel: string;
  category: string;
  serialNum: string;
  proposedBy: string;
  proposedAt: string;
  reason: string;
};

const INITIAL_ROWS: ProposedAsset[] = [
  {
    id: '1',
    assetLabel: 'Dell Latitude 5520',
    category: 'Laptop / Desktop',
    serialNum: 'DL5520-88421',
    proposedBy: 'Ahmad Rizal',
    proposedAt: '2026-08-11',
    reason: 'End of life / beyond repair',
  },
  {
    id: '2',
    assetLabel: 'Cisco Catalyst 2960',
    category: 'Network',
    serialNum: 'FCW2134L0AB',
    proposedBy: 'Siti Nurhaliza',
    proposedAt: '2026-08-09',
    reason: 'Obsolete hardware',
  },
  {
    id: '3',
    assetLabel: 'Epson EB-X06 Projector',
    category: 'AV',
    serialNum: 'X06-77291',
    proposedBy: 'Lim Wei Jie',
    proposedAt: '2026-08-08',
    reason: 'Damaged optics',
  },
  {
    id: '4',
    assetLabel: 'Ubiquiti UniFi AP AC Pro',
    category: 'Network',
    serialNum: 'FCEC1234ABCD',
    proposedBy: 'Ahmad Rizal',
    proposedAt: '2026-08-01',
    reason: 'Replaced by newer model',
  },
  {
    id: '5',
    assetLabel: 'HP ProBook 450 G8',
    category: 'Laptop / Desktop',
    serialNum: '5CD1234ABC',
    proposedBy: 'Nur Aisyah',
    proposedAt: '2026-07-29',
    reason: 'Battery swollen',
  },
  {
    id: '6',
    assetLabel: 'Logitech Meetup Camera',
    category: 'AV',
    serialNum: 'LM-20441',
    proposedBy: 'Lim Wei Jie',
    proposedAt: '2026-07-22',
    reason: 'Faulty microphone array',
  },
  {
    id: '7',
    assetLabel: 'TP-Link Archer C7',
    category: 'Network',
    serialNum: 'TP-C7-9912',
    proposedBy: 'Siti Nurhaliza',
    proposedAt: '2026-07-18',
    reason: 'End of support',
  },
];

const CATEGORIES = ['all', 'Laptop / Desktop', 'AV', 'Network'] as const;

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

export function DisposalUnitDisposalPage() {
  const [rows, setRows] = useState(INITIAL_ROWS);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmOpen, setConfirmOpen] = useState(false);

  const dateRangeInvalid = useMemo(() => {
    if (!dateFrom || !dateTo) return false;
    const from = isoToLocalDate(dateFrom);
    const to = isoToLocalDate(dateTo);
    return Boolean(from && to && from > to);
  }, [dateFrom, dateTo]);

  const filtered = useMemo(() => {
    if (dateRangeInvalid) return [];
    const q = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (category !== 'all' && row.category !== category) return false;
      if (!matchesDateFilter(row.proposedAt, dateFrom, dateTo)) return false;
      if (!q) return true;
      return [row.assetLabel, row.serialNum, row.proposedBy, row.reason]
        .join(' ')
        .toLowerCase()
        .includes(q);
    });
  }, [rows, search, category, dateFrom, dateTo, dateRangeInvalid]);

  const allFilteredSelected =
    filtered.length > 0 && filtered.every((row) => selected.has(row.id));
  const someFilteredSelected =
    filtered.some((row) => selected.has(row.id)) && !allFilteredSelected;

  const selectedRows = useMemo(
    () => rows.filter((row) => selected.has(row.id)),
    [rows, selected],
  );

  const toggleOne = (id: string, next: boolean) => {
    setSelected((prev) => {
      const copy = new Set(prev);
      if (next) copy.add(id);
      else copy.delete(id);
      return copy;
    });
  };

  const toggleAllFiltered = (next: boolean) => {
    setSelected((prev) => {
      const copy = new Set(prev);
      for (const row of filtered) {
        if (next) copy.add(row.id);
        else copy.delete(row.id);
      }
      return copy;
    });
  };

  const handleBatchDispose = () => {
    const count = selected.size;
    setRows((prev) => prev.filter((row) => !selected.has(row.id)));
    setSelected(new Set());
    setConfirmOpen(false);
    toast.success(`${count} asset${count === 1 ? '' : 's'} marked as disposed`);
  };

  return (
    <DisposalUnitShell>
      <div className="mb-5 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">Disposal</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {filtered.length} proposed asset{filtered.length === 1 ? '' : 's'}
            {filtered.length !== rows.length ? ` of ${rows.length}` : ''}
            {' · '}
            Select assets to dispose in batch
          </p>
        </div>
        <Button
          type="button"
          className="shrink-0 gap-1.5 rounded-[8px]"
          disabled={selected.size === 0}
          onClick={() => setConfirmOpen(true)}
        >
          <Trash2 className="h-4 w-4" />
          Dispose selected{selected.size > 0 ? ` (${selected.size})` : ''}
        </Button>
      </div>

      <Card className="mb-4 rounded-[14px] border-border shadow-sm">
        <CardContent className="space-y-3 p-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,1.5fr)_minmax(10rem,0.85fr)_minmax(10rem,0.85fr)_minmax(10rem,0.85fr)] xl:items-end">
            <div className="min-w-0 space-y-1.5">
              <Label className="text-xs text-muted-foreground">Search</Label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Asset, serial, reason…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-10 rounded-[8px] border-border bg-background pl-9 shadow-none"
                />
              </div>
            </div>
            <div className="min-w-0 space-y-1.5">
              <Label className="text-xs text-muted-foreground">Category</Label>
              <Select
                value={category}
                onValueChange={(v) => setCategory(v as (typeof CATEGORIES)[number])}
              >
                <SelectTrigger className="h-10 w-full rounded-[8px] border-border bg-background shadow-none">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  <SelectItem value="Laptop / Desktop">Laptop / Desktop</SelectItem>
                  <SelectItem value="AV">AV</SelectItem>
                  <SelectItem value="Network">Network</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="min-w-0 [&_button]:border-border [&_button]:shadow-none [&_label]:text-muted-foreground [&_.space-y-2]:space-y-1.5">
              <DatePickerField label="From date" value={dateFrom} onChange={setDateFrom} />
            </div>
            <div className="min-w-0 [&_button]:border-border [&_button]:shadow-none [&_label]:text-muted-foreground [&_.space-y-2]:space-y-1.5">
              <DatePickerField label="To date" value={dateTo} onChange={setDateTo} />
            </div>
          </div>

          {dateRangeInvalid ? (
            <p className="text-xs text-destructive">End date must be on or after start date.</p>
          ) : null}
        </CardContent>
      </Card>

      {selected.size > 0 ? (
        <div className="mb-4 flex flex-col gap-3 rounded-[12px] border border-[oklch(0.45_0.12_290)]/25 bg-lavender/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-foreground">
            <span className="font-semibold tabular-nums">{selected.size}</span> asset
            {selected.size === 1 ? '' : 's'} selected for batch disposal
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              className="h-9 rounded-[8px]"
              onClick={() => setSelected(new Set())}
            >
              Clear selection
            </Button>
            <Button
              type="button"
              className="h-9 gap-1.5 rounded-[8px]"
              onClick={() => setConfirmOpen(true)}
            >
              <Trash2 className="h-4 w-4" />
              Dispose batch
            </Button>
          </div>
        </div>
      ) : null}

      <Card className="overflow-hidden rounded-[14px] border-border shadow-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="h-11 w-12 px-4 sm:px-5">
                  <Checkbox
                    checked={allFilteredSelected ? true : someFilteredSelected ? 'indeterminate' : false}
                    onCheckedChange={(v) => toggleAllFiltered(v === true)}
                    aria-label="Select all visible"
                    disabled={filtered.length === 0}
                  />
                </TableHead>
                <TableHead className="h-11 px-4">Asset</TableHead>
                <TableHead className="h-11 px-4">Category</TableHead>
                <TableHead className="h-11 px-4">Serial</TableHead>
                <TableHead className="h-11 px-4">Reason</TableHead>
                <TableHead className="h-11 px-4">Proposed by</TableHead>
                <TableHead className="h-11 px-4 sm:px-5">Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-16 text-center text-sm text-muted-foreground">
                    {rows.length === 0
                      ? 'No assets proposed for disposal.'
                      : 'No assets match your filters.'}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((row) => {
                  const isSelected = selected.has(row.id);
                  return (
                    <TableRow
                      key={row.id}
                      className={cn('cursor-pointer', isSelected && 'bg-lavender/5')}
                      onClick={() => toggleOne(row.id, !isSelected)}
                    >
                      <TableCell className="px-4 py-3 sm:px-5" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={(v) => toggleOne(row.id, v === true)}
                          aria-label={`Select ${row.assetLabel}`}
                        />
                      </TableCell>
                      <TableCell className="px-4 py-3 font-medium text-foreground">
                        {row.assetLabel}
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        <Badge
                          variant="outline"
                          className="rounded-[6px] border-border bg-muted/40 font-medium text-muted-foreground"
                        >
                          {row.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-4 py-3 font-mono text-xs text-muted-foreground">
                        {row.serialNum}
                      </TableCell>
                      <TableCell className="max-w-[14rem] px-4 py-3 text-muted-foreground">
                        <span className="line-clamp-2">{row.reason}</span>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-muted-foreground">{row.proposedBy}</TableCell>
                      <TableCell className="px-4 py-3 text-muted-foreground sm:px-5">
                        {formatDate(row.proposedAt)}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent className="rounded-[14px]">
          <AlertDialogHeader>
            <AlertDialogTitle>Dispose selected assets?</AlertDialogTitle>
            <AlertDialogDescription>
              You are about to dispose {selectedRows.length} asset
              {selectedRows.length === 1 ? '' : 's'} in this batch. This action is for UI preview only.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {selectedRows.length > 0 ? (
            <ul className="max-h-40 space-y-1.5 overflow-y-auto rounded-[10px] border border-border bg-muted/30 p-3 text-sm">
              {selectedRows.map((row) => (
                <li key={row.id} className="flex items-center justify-between gap-3">
                  <span className="min-w-0 truncate font-medium text-foreground">{row.assetLabel}</span>
                  <span className="shrink-0 font-mono text-xs text-muted-foreground">{row.serialNum}</span>
                </li>
              ))}
            </ul>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-[8px]">Cancel</AlertDialogCancel>
            <AlertDialogAction className="rounded-[8px]" onClick={handleBatchDispose}>
              Confirm dispose
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DisposalUnitShell>
  );
}
