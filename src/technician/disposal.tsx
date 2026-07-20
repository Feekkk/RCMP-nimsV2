import { useMemo, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Laptop, Network, Search, Trash2, Tv } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { AssetKind } from '@/lib/inventory-schema';
import { ASSET_KIND_LABEL, formatStatusLabel } from '@/lib/inventory-schema';
import { readTechnicianSession } from '@/lib/auth-session';
import { DISPOSAL_ELIGIBLE_STATUS_IDS } from '@/lib/disposal-schema';
import { normalizeToIsoDate } from '@/lib/date-format';
import { filterBySearch, useAssets } from '@/hooks/assets';
import { usePagination } from '@/hooks/use-pagination';
import { createDisposalFn } from '@/server/disposal.functions';
import { AssetStatusBadge } from '@/technician/asset-status-badge';
import { AssetTablePagination } from '@/technician/asset-table-pagination';
import { TechnicianShell } from '@/technician/technician-shell';
import { DatePickerField, FormField } from '@/technician/deploy-return-fields';

type EligibleRow = {
  kind: AssetKind;
  assetId: number;
  model: string | null;
  brand: string | null;
  category: string | null;
  serialNum: string | null;
  statusId: number;
};

function assetKey(kind: AssetKind, assetId: number) {
  return `${kind}:${assetId}`;
}

type KindFilter = 'all' | AssetKind;

const ELIGIBLE_SET = new Set<number>(DISPOSAL_ELIGIBLE_STATUS_IDS);

function KindCell({ kind }: { kind: AssetKind }) {
  const Icon = kind === 'laptop' ? Laptop : kind === 'av' ? Tv : Network;
  return (
    <span className="inline-flex items-center gap-1.5 text-sm">
      <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      {ASSET_KIND_LABEL[kind]}
    </span>
  );
}

export function TechnicianDisposalPage() {
  const laptop = useAssets('laptop');
  const av = useAssets('av');
  const network = useAssets('network');

  const [search, setSearch] = useState('');
  const [kindFilter, setKindFilter] = useState<KindFilter>('all');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [disposalDate, setDisposalDate] = useState('');
  const [disposalTime, setDisposalTime] = useState('');
  const [disposalRemarks, setDisposalRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loading = laptop.isLoading || av.isLoading || network.isLoading;
  const loadError = laptop.error || av.error || network.error;

  const eligible = useMemo((): EligibleRow[] => {
    const rows: EligibleRow[] = [];
    for (const a of laptop.items) {
      if (!ELIGIBLE_SET.has(a.statusId)) continue;
      rows.push({
        kind: 'laptop',
        assetId: a.assetId,
        model: a.model,
        brand: a.brand,
        category: a.category,
        serialNum: a.serialNum,
        statusId: a.statusId,
      });
    }
    for (const a of av.items) {
      if (!ELIGIBLE_SET.has(a.statusId)) continue;
      rows.push({
        kind: 'av',
        assetId: a.assetId,
        model: a.model,
        brand: a.brand,
        category: a.category,
        serialNum: a.serialNum,
        statusId: a.statusId,
      });
    }
    for (const a of network.items) {
      if (!ELIGIBLE_SET.has(a.statusId)) continue;
      rows.push({
        kind: 'network',
        assetId: a.assetId,
        model: a.model,
        brand: a.brand,
        category: null,
        serialNum: a.serialNum,
        statusId: a.statusId,
      });
    }
    return rows.sort((a, b) => a.assetId - b.assetId);
  }, [laptop.items, av.items, network.items]);

  const filtered = useMemo(() => {
    let list = eligible;
    if (kindFilter !== 'all') {
      list = list.filter((a) => a.kind === kindFilter);
    }
    return filterBySearch(list, search, (a) => a.category ?? '');
  }, [eligible, kindFilter, search]);

  const pagination = usePagination(filtered, {
    resetKey: `${search}|${kindFilter}`,
  });

  const filteredKeys = useMemo(
    () => filtered.map((a) => assetKey(a.kind, a.assetId)),
    [filtered],
  );

  const allFilteredSelected =
    filtered.length > 0 && filteredKeys.every((k) => selected.has(k));
  const someFilteredSelected = filteredKeys.some((k) => selected.has(k));

  const toggleOne = (key: string, checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(key);
      else next.delete(key);
      return next;
    });
  };

  const toggleAllFiltered = (checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) filteredKeys.forEach((k) => next.add(k));
      else filteredKeys.forEach((k) => next.delete(k));
      return next;
    });
  };

  const selectedRows = useMemo(
    () => eligible.filter((a) => selected.has(assetKey(a.kind, a.assetId))),
    [eligible, selected],
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const session = readTechnicianSession();
    if (!session?.staffId) {
      toast.error('Your technician session could not be verified. Sign out and sign in again.');
      return;
    }
    const isoDate = normalizeToIsoDate(disposalDate);
    if (!isoDate) {
      toast.error('Select a disposal date');
      return;
    }
    if (selectedRows.length === 0) {
      toast.error('Select at least one asset');
      return;
    }

    setSubmitting(true);
    try {
      const result = await createDisposalFn({
        data: {
          requestedBy: session.staffId,
          disposalDate: isoDate,
          disposalTime: disposalTime.trim() || null,
          disposalRemarks: disposalRemarks.trim() || null,
          assets: selectedRows.map((a) => ({
            kind: a.kind,
            assetId: a.assetId,
          })),
        },
      });
      toast.success(`Disposal #${result.disposalId} recorded for ${result.itemCount} asset(s)`);
      setSelected(new Set());
      setDisposalRemarks('');
      setDisposalTime('');
      await Promise.all([laptop.refetch(), av.refetch(), network.refetch()]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Disposal failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <TechnicianShell>
      <div className="mb-5 flex flex-col gap-1 sm:mb-6">
        <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">Asset disposal</h1>
        <p className="max-w-2xl text-xs text-muted-foreground sm:text-sm">
          Select one or more assets in <span className="font-medium text-foreground">return</span> status.
          Submitting creates a disposal record and marks each asset as disposed.
        </p>
      </div>

      {loadError && (
        <p className="mb-4 text-sm text-destructive">
          {loadError} — check MySQL is running and schema includes disposal tables.
        </p>
      )}

      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-6">
        <div className="rounded-[12px] border border-border/70 bg-card/40 p-4 sm:p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <DatePickerField
              label="Disposal date"
              value={disposalDate}
              onChange={setDisposalDate}
              required
            />
            <FormField label="Disposal time">
              <Input
                type="time"
                value={disposalTime}
                onChange={(e) => setDisposalTime(e.target.value)}
                className="rounded-[8px]"
              />
            </FormField>
            <div className="sm:col-span-2">
              <FormField label="Disposal remarks">
                <Textarea
                  value={disposalRemarks}
                  onChange={(e) => setDisposalRemarks(e.target.value)}
                  placeholder="Reason, approval reference, vendor, etc."
                  className="min-h-[72px] rounded-[8px]"
                />
              </FormField>
            </div>
          </div>
        </div>

        <Card className="overflow-hidden rounded-[14px] border-border shadow-sm">
          <CardHeader className="flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <CardTitle className="text-base">Eligible assets</CardTitle>
              <CardDescription>
                Status: {DISPOSAL_ELIGIBLE_STATUS_IDS.map((id) => formatStatusLabel(id)).join(' · ')}
              </CardDescription>
            </div>
            <ToggleGroup
              type="single"
              value={kindFilter}
              onValueChange={(v) => {
                if (v) setKindFilter(v as KindFilter);
              }}
              className="justify-start"
            >
              <ToggleGroupItem value="all" className="rounded-[8px] px-3 text-xs">
                All
              </ToggleGroupItem>
              <ToggleGroupItem value="laptop" className="rounded-[8px] px-3 text-xs">
                Laptop
              </ToggleGroupItem>
              <ToggleGroupItem value="av" className="rounded-[8px] px-3 text-xs">
                AV
              </ToggleGroupItem>
              <ToggleGroupItem value="network" className="rounded-[8px] px-3 text-xs">
                Network
              </ToggleGroupItem>
            </ToggleGroup>
          </CardHeader>
          <CardContent className="space-y-3 p-0 sm:p-0">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
              <div className="relative w-full sm:max-w-xs">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search ID, model, serial…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-9 rounded-[10px] pl-9"
                />
              </div>
              <p className="text-sm text-muted-foreground">
                {selected.size} selected
                {filtered.length !== eligible.length && ` · ${filtered.length} shown`}
              </p>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-10">
                      <Checkbox
                        checked={allFilteredSelected ? true : someFilteredSelected ? 'indeterminate' : false}
                        onCheckedChange={(v) => toggleAllFiltered(v === true)}
                        aria-label="Select all visible"
                      />
                    </TableHead>
                    <TableHead className="font-semibold">Kind</TableHead>
                    <TableHead className="font-semibold">ID</TableHead>
                    <TableHead className="font-semibold">Model</TableHead>
                    <TableHead className="font-semibold">Brand</TableHead>
                    <TableHead className="font-semibold">Category</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                        Loading…
                      </TableCell>
                    </TableRow>
                  ) : filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                        {eligible.length === 0
                          ? 'No returned assets available for disposal.'
                          : 'No assets match your filters.'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    pagination.paginatedItems.map((a) => {
                      const key = assetKey(a.kind, a.assetId);
                      return (
                        <TableRow
                          key={key}
                          className="cursor-pointer"
                          onClick={() => toggleOne(key, !selected.has(key))}
                        >
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              checked={selected.has(key)}
                              onCheckedChange={(v) => toggleOne(key, v === true)}
                              aria-label={`Select ${a.kind} ${a.assetId}`}
                            />
                          </TableCell>
                          <TableCell>
                            <KindCell kind={a.kind} />
                          </TableCell>
                          <TableCell>
                            <Link
                              to="/technician/asset/$kind/$assetId"
                              params={{ kind: a.kind, assetId: a.assetId }}
                              className="font-mono text-xs text-[oklch(0.45_0.12_290)] hover:underline"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {a.assetId}
                            </Link>
                          </TableCell>
                          <TableCell className="font-medium">{a.model ?? '—'}</TableCell>
                          <TableCell className="text-muted-foreground">{a.brand ?? '—'}</TableCell>
                          <TableCell className="text-muted-foreground">{a.category ?? '—'}</TableCell>
                          <TableCell>
                            <AssetStatusBadge statusId={a.statusId} />
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
            <AssetTablePagination
              page={pagination.page}
              totalPages={pagination.totalPages}
              pageSize={pagination.pageSize}
              rangeStart={pagination.rangeStart}
              rangeEnd={pagination.rangeEnd}
              totalItems={pagination.totalItems}
              totalLoaded={eligible.length}
              onPageChange={pagination.setPage}
              onPageSizeChange={pagination.setPageSize}
            />
            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border px-4 py-4">
              <Button
                type="submit"
                className="gap-1.5 rounded-[8px]"
                disabled={submitting || selected.size === 0}
              >
                <Trash2 className="h-4 w-4" />
                {submitting ? 'Submitting…' : `Submit disposal (${selected.size})`}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </TechnicianShell>
  );
}
