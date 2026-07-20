import { useMemo, useState } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { Search, Server } from 'lucide-react';
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
import { filterBySearch, filterByStatus, useAssets } from '@/hooks/assets';
import { usePagination } from '@/hooks/use-pagination';
import { AssetStockSummary } from '@/technician/asset-stock-summary';
import { AssetTablePagination } from '@/technician/asset-table-pagination';
import {
  formatPlaceCell,
  PlaceTableHead,
  type PlaceColumnView,
} from '@/technician/asset-place-column';

export function TechnicianNetworkPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<number | null>(null);
  const [placeColumnView, setPlaceColumnView] = useState<PlaceColumnView>('place');
  const { items, isLoading, error, updateStatus } = useAssets('network');

  const filtered = useMemo(() => {
    const bySearch = filterBySearch(items, search, (item) =>
      [item.category ?? '', item.ipAddress ?? ''].join(' '),
    );
    return filterByStatus(bySearch, statusFilter);
  }, [items, search, statusFilter]);

  const pagination = usePagination(filtered, {
    resetKey: `${search}|${statusFilter ?? ''}`,
  });

  return (
    <TechnicianShell>
      <div className="mb-5 flex flex-col gap-1 sm:mb-6">
        <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">Network equipment</h1>
        <p className="text-xs text-muted-foreground sm:text-sm">List of network equipment in the system</p>
      </div>

      <AssetStockSummary items={items} />

      <div className="mb-4 flex items-center justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search asset ID, category, model, IP, MAC…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 rounded-[10px] pl-9"
          />
        </div>
        <RegisterAssetActions
          kind="network"
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
        />
      </div>

      {error && <p className="mb-4 text-sm text-destructive">{error}</p>}

      <Card className="overflow-hidden rounded-[14px] border-border shadow-sm">
        <CardContent className="p-0 sm:p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent [&>th]:text-muted-foreground">
                  <TableHead className="whitespace-nowrap font-semibold">ID</TableHead>
                  <TableHead className="whitespace-nowrap font-semibold">Category</TableHead>
                  <TableHead className="min-w-[180px] font-semibold">Model</TableHead>
                  <TableHead className="whitespace-nowrap font-semibold">Brand</TableHead>
                  <TableHead className="whitespace-nowrap font-semibold">IP</TableHead>
                  <TableHead className="whitespace-nowrap font-semibold">MAC</TableHead>
                  <PlaceTableHead view={placeColumnView} onViewChange={setPlaceColumnView} />
                  <TableHead className="whitespace-nowrap font-semibold">Status</TableHead>
                  <TableHead className="min-w-[140px] font-semibold">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="py-12 text-center text-sm text-muted-foreground">
                      Loading…
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="py-12 text-center text-sm text-muted-foreground">
                      No assets match your search or status filter.
                    </TableCell>
                  </TableRow>
                ) : (
                  pagination.paginatedItems.map((item) => (
                    <TableRow
                      key={item.assetId}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() =>
                        void navigate({
                          to: '/technician/asset/$kind/$assetId',
                          params: { kind: 'network', assetId: item.assetId },
                        })
                      }
                    >
                      <TableCell>
                        <Link
                          to="/technician/asset/$kind/$assetId"
                          params={{ kind: 'network', assetId: item.assetId }}
                          className="text-primary underline-offset-2 hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <code className="text-xs">{item.assetId}</code>
                        </Link>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{item.category ?? '—'}</TableCell>
                      <TableCell className="font-medium text-foreground">
                        <span className="inline-flex items-center gap-1.5">
                          <Server className="h-4 w-4 text-[oklch(0.45_0.12_290)]" />
                          {item.model}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{item.brand ?? '—'}</TableCell>
                      <TableCell className="text-muted-foreground">{item.ipAddress ?? '—'}</TableCell>
                      <TableCell className="text-muted-foreground">{item.macAddress ?? '—'}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatPlaceCell(placeColumnView, item)}
                      </TableCell>
                      <TableCell>
                        <AssetStatusBadge statusId={item.statusId} />
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
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
          <AssetTablePagination
            page={pagination.page}
            totalPages={pagination.totalPages}
            pageSize={pagination.pageSize}
            rangeStart={pagination.rangeStart}
            rangeEnd={pagination.rangeEnd}
            totalItems={pagination.totalItems}
            totalLoaded={items.length}
            onPageChange={pagination.setPage}
            onPageSizeChange={pagination.setPageSize}
          />
        </CardContent>
      </Card>
    </TechnicianShell>
  );
}
