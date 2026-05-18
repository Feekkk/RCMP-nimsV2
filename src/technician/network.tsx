import { useMemo, useState, type ElementType } from 'react';
import { PackageCheck, PackageX, Search, Server } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { TechnicianShell } from '@/technician/technician-shell';
import { AssetStatusActions } from '@/technician/asset-status-actions';
import { AssetStatusBadge } from '@/technician/asset-status-badge';
import { RegisterAssetActions } from '@/technician/register-asset-actions';
import { countActiveAssets, filterBySearch, useAssets } from '@/hooks/assets';

function StockCountCard({
  icon: Icon,
  label,
  value,
  tint,
}: {
  icon: ElementType;
  label: string;
  value: number;
  tint: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-[14px] border border-border bg-card p-4">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] ${tint}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="text-xl font-bold tabular-nums text-foreground">{value}</p>
      </div>
    </div>
  );
}

export function TechnicianNetworkPage() {
  const [search, setSearch] = useState('');
  const { items, isLoading, error, updateStatus } = useAssets('network');

  const { otherCount, filtered } = useMemo(() => {
    const filteredList = filterBySearch(items, search, (item) => item.ipAddress ?? '');
    const { active, other } = countActiveAssets(items);
    return { activeCount: active, otherCount: other, filtered: filteredList };
  }, [items, search]);

  return (
    <TechnicianShell>
      <div className="mb-5 flex flex-col gap-1 sm:mb-6">
        <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">Network equipment</h1>
        <p className="text-xs text-muted-foreground sm:text-sm">From MySQL table `network`</p>
      </div>

      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:mb-6">
        <StockCountCard
          icon={PackageCheck}
          label="Online (status_id 7)"
          value={items.filter((i) => i.statusId === 7).length}
          tint="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
        />
        <StockCountCard
          icon={PackageX}
          label="Other statuses"
          value={otherCount}
          tint="bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200"
        />
      </div>

      <div className="mb-4 flex items-center justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search asset ID, model, IP, MAC…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 rounded-[10px] pl-9"
          />
        </div>
        <RegisterAssetActions kind="network" />
      </div>

      {error && <p className="mb-4 text-sm text-destructive">{error}</p>}

      <Card className="overflow-hidden rounded-[14px] border-border shadow-sm">
        <CardContent className="p-0 sm:p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent [&>th]:text-muted-foreground">
                  <TableHead className="whitespace-nowrap font-semibold">ID</TableHead>
                  <TableHead className="min-w-[180px] font-semibold">Model</TableHead>
                  <TableHead className="whitespace-nowrap font-semibold">Brand</TableHead>
                  <TableHead className="whitespace-nowrap font-semibold">IP</TableHead>
                  <TableHead className="whitespace-nowrap font-semibold">MAC</TableHead>
                  <TableHead className="whitespace-nowrap font-semibold">Status</TableHead>
                  <TableHead className="min-w-[140px] font-semibold">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-12 text-center text-sm text-muted-foreground">
                      Loading…
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-12 text-center text-sm text-muted-foreground">
                      No assets match your search.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((item) => (
                    <TableRow key={item.assetId} className="hover:bg-muted/50">
                      <TableCell>
                        <code className="text-xs">{item.assetId}</code>
                      </TableCell>
                      <TableCell className="font-medium text-foreground">
                        <span className="inline-flex items-center gap-1.5">
                          <Server className="h-4 w-4 text-[oklch(0.45_0.12_290)]" />
                          {item.model}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{item.brand ?? '—'}</TableCell>
                      <TableCell className="text-muted-foreground">{item.ipAddress ?? '—'}</TableCell>
                      <TableCell className="text-muted-foreground">{item.macAddress ?? '—'}</TableCell>
                      <TableCell>
                        <AssetStatusBadge statusId={item.statusId} />
                      </TableCell>
                      <TableCell>
                        <AssetStatusActions
                          kind="network"
                          assetId={item.assetId}
                          statusId={item.statusId}
                          onStatusChange={updateStatus}
                          disabled={isLoading}
                        />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <p className="flex items-center gap-1.5 border-t border-border px-4 py-3 text-xs text-muted-foreground">
            <PackageCheck className="h-3.5 w-3.5" />
            Showing {filtered.length} of {items.length} records
          </p>
        </CardContent>
      </Card>
    </TechnicianShell>
  );
}
