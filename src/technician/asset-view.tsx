import { useCallback, useEffect, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { ArrowLeft, History } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { AssetDetail, AssetDetailResponse, AssetKind, AssetTrailEvent } from '@/lib/inventory-schema';
import { ASSET_KIND_LABEL, ASSET_LIST_PATH } from '@/lib/inventory-schema';
import { formatAssetAge, formatPurchaseDateLabel } from '@/lib/date-format';
import { formatPurchaseCost } from '@/lib/purchase-field-utils';
import { AssetStatusActions } from '@/technician/asset-status-actions';
import { TechnicianShell } from '@/technician/technician-shell';
import { getAssetDetailFn } from '@/server/assets.functions';

function DetailItem({ label, value }: { label: string; value: string | null | undefined }) {
  const text = value?.trim() ? value : '—';
  return (
    <div className="rounded-[10px] border border-border/80 px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm text-foreground break-words">{text}</p>
    </div>
  );
}

function formatTrailWhen(at: string): string {
  if (!at) return '—';
  const d = new Date(at);
  return Number.isNaN(d.getTime()) ? at : d.toLocaleString();
}

function AssetSpecs({ asset }: { asset: AssetDetail }) {
  if (asset.kind === 'laptop') {
    return (
      <>
        <DetailItem label="Category" value={asset.category} />
        <DetailItem label="Serial" value={asset.serialNum} />
        <DetailItem label="Brand" value={asset.brand} />
        <DetailItem label="Model" value={asset.model} />
        <DetailItem label="Part number" value={asset.partNumber} />
        <DetailItem label="Processor" value={asset.processor} />
        <DetailItem label="Memory" value={asset.memory} />
        <DetailItem label="Storage" value={asset.storage} />
        <DetailItem label="OS" value={asset.os} />
        <DetailItem label="GPU" value={asset.gpu} />
      </>
    );
  }
  if (asset.kind === 'av') {
    return (
      <>
        <DetailItem label="Legacy ID" value={asset.assetIdOld} />
        <DetailItem label="Category" value={asset.category} />
        <DetailItem label="Brand" value={asset.brand} />
        <DetailItem label="Model" value={asset.model} />
        <DetailItem label="Serial" value={asset.serialNum} />
      </>
    );
  }
  return (
    <>
      <DetailItem label="Brand" value={asset.brand} />
      <DetailItem label="Model" value={asset.model} />
      <DetailItem label="Serial" value={asset.serialNum} />
      <DetailItem label="IP address" value={asset.ipAddress} />
      <DetailItem label="MAC address" value={asset.macAddress} />
    </>
  );
}

function PurchaseBlock({ asset }: { asset: AssetDetail }) {
  return (
    <>
      <DetailItem label="PO date" value={formatPurchaseDateLabel(asset.poDate)} />
      <DetailItem label="PO number" value={asset.poNum} />
      <DetailItem label="DO date" value={formatPurchaseDateLabel(asset.doDate)} />
      <DetailItem label="DO number" value={asset.doNum} />
      <DetailItem label="Invoice date" value={formatPurchaseDateLabel(asset.invoiceDate)} />
      <DetailItem label="Invoice number" value={asset.invoiceNum} />
      <DetailItem label="Purchase cost" value={formatPurchaseCost(asset.purchaseCost)} />
    </>
  );
}

function TrailsTable({ trails }: { trails: AssetTrailEvent[] }) {
  return (
    <div className="overflow-x-auto rounded-[10px] border border-border">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-44 whitespace-nowrap">When</TableHead>
            <TableHead className="w-36">Category</TableHead>
            <TableHead className="w-32">Event</TableHead>
            <TableHead>Details</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {trails.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="py-8 text-center text-sm text-muted-foreground">
                No trail events recorded yet.
              </TableCell>
            </TableRow>
          ) : (
            trails.map((ev, idx) => (
              <TableRow key={`${ev.category}-${ev.title}-${ev.at}-${idx}`}>
                <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                  {formatTrailWhen(ev.at)}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="rounded-[6px] text-[10px] font-normal">
                    {ev.category}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm font-medium">{ev.title}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{ev.detail ?? '—'}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

type TechnicianAssetViewPageProps = {
  kind: AssetKind;
  assetId: number;
};

export function TechnicianAssetViewPage({ kind, assetId }: TechnicianAssetViewPageProps) {
  const [data, setData] = useState<AssetDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getAssetDetailFn({ data: { kind, assetId } });
      setData(result);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load asset');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [kind, assetId]);

  useEffect(() => {
    void load();
  }, [load]);

  const listPath = ASSET_LIST_PATH[kind];
  const asset = data?.asset;
  const assetAge = asset ? formatAssetAge(asset.poDate, asset.createdAt) : null;

  const handleStatusChange = async (_assetId: number, statusId: number) => {
    const { updateAssetStatusFn } = await import('@/server/assets.functions');
    await updateAssetStatusFn({ data: { kind, assetId, statusId } });
    await load();
  };

  return (
    <TechnicianShell>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <Button variant="outline" size="sm" className="rounded-[8px]" asChild>
          <Link to={listPath}>
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Back to list
          </Link>
        </Button>
      </div>

      {loading ? (
        <p className="py-12 text-center text-sm text-muted-foreground">Loading asset…</p>
      ) : !asset ? (
        <Card className="rounded-[14px]">
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Asset not found.
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {ASSET_KIND_LABEL[kind]}
              </p>
              <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
                Asset <code className="text-lg">#{asset.assetId}</code>
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {asset.model ?? '—'}
                {asset.brand ? ` · ${asset.brand}` : ''}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {assetAge && <p className="text-sm text-muted-foreground">{assetAge}</p>}
              <AssetStatusActions
                kind={kind}
                assetId={asset.assetId}
                statusId={asset.statusId}
                onStatusChange={handleStatusChange}
              />
            </div>
          </div>

          <div className="mb-6 grid gap-4 lg:grid-cols-2">
            <Card className="rounded-[14px]">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Specifications</CardTitle>
                <CardDescription>Core fields from the inventory record</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-2 sm:grid-cols-2">
                <AssetSpecs asset={asset} />
                <DetailItem label="Remarks" value={asset.remarks} />
              </CardContent>
            </Card>

            <Card className="rounded-[14px]">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Procurement</CardTitle>
                <CardDescription>PO, delivery, and invoice details</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-2 sm:grid-cols-2">
                <PurchaseBlock asset={asset} />
              </CardContent>
            </Card>

            <Card className="rounded-[14px] lg:col-span-2">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Record</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-2 sm:grid-cols-3">
                <DetailItem label="Status" value={asset.statusName} />
                <DetailItem
                  label="Created"
                  value={asset.createdAt ? formatTrailWhen(asset.createdAt) : null}
                />
                <DetailItem
                  label="Last updated"
                  value={asset.updatedAt ? formatTrailWhen(asset.updatedAt) : null}
                />
              </CardContent>
            </Card>
          </div>

          <Card className="rounded-[14px]">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <History className="h-4 w-4" />
                Activity trail
              </CardTitle>
              <CardDescription>
                Handovers, deployments, borrow requests, repairs, warranty, and disposal events
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TrailsTable trails={data.trails} />
            </CardContent>
          </Card>
        </>
      )}
    </TechnicianShell>
  );
}

