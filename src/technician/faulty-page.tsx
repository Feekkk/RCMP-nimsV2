import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearch } from '@tanstack/react-router';
import { ArrowLeft, Loader2, ShieldCheck, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDateLabel } from '@/lib/date-format';
import { STATUS_ID } from '@/lib/asset-status-actions';
import { ASSET_KIND_LABEL, ASSET_LIST_PATH, useAssets } from '@/hooks/assets';
import { getWarrantyContextFn } from '@/server/warranty-repair.functions';
import { parseFaultyAssetRouteSearch, type WarrantyContext } from '@/lib/warranty-repair-schema';
import { TechnicianShell } from '@/technician/technician-shell';
import { AssetStatusBadge } from '@/technician/asset-status-badge';

export function TechnicianFaultyPage() {
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as Record<string, unknown>;
  const params = parseFaultyAssetRouteSearch(search);
  const kind = params?.kind;
  const assetId = params?.assetId;

  const laptop = useAssets('laptop');
  const av = useAssets('av');
  const network = useAssets('network');

  const [ctx, setCtx] = useState<WarrantyContext | null>(null);
  const [loadingCtx, setLoadingCtx] = useState(true);

  const asset = useMemo(() => {
    if (!kind || !assetId) return null;
    const items = kind === 'laptop' ? laptop.items : kind === 'av' ? av.items : network.items;
    return items.find((i) => i.assetId === assetId) ?? null;
  }, [kind, assetId, laptop.items, av.items, network.items]);

  useEffect(() => {
    if (!kind || !assetId) {
      setCtx(null);
      setLoadingCtx(false);
      return;
    }
    let cancelled = false;
    setLoadingCtx(true);
    void getWarrantyContextFn({ data: { kind, assetId } })
      .then((w) => {
        if (!cancelled) setCtx(w);
      })
      .finally(() => {
        if (!cancelled) setLoadingCtx(false);
      });
    return () => {
      cancelled = true;
    };
  }, [kind, assetId]);

  if (!kind || !assetId) {
    return (
      <TechnicianShell>
        <p className="text-sm text-destructive">Invalid link. Mark an asset faulty from inventory first.</p>
        <Button variant="outline" className="mt-4 rounded-[8px]" asChild>
          <Link to="/technician/dashboard">Dashboard</Link>
        </Button>
      </TechnicianShell>
    );
  }

  const isFaulty = asset?.statusId === STATUS_ID.FAULTY;

  return (
    <TechnicianShell>
      <div className="mb-6">
        <Button
          variant="ghost"
          size="sm"
          type="button"
          className="-ml-2 mb-2 gap-1.5"
          onClick={() => void navigate({ to: ASSET_LIST_PATH[kind] })}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to {ASSET_KIND_LABEL[kind]}
        </Button>
        <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">Faulty asset</h1>
        <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
          Choose vendor warranty claim (while in coverage) or log an in-house repair.
        </p>
      </div>

      <Card className="mb-4 rounded-[14px] border-border shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            Asset {assetId}
            {asset && (
              <span className="ml-2 font-normal text-muted-foreground">
                — {[asset.brand, asset.model].filter(Boolean).join(' ') || '—'}
              </span>
            )}
          </CardTitle>
          <CardDescription>
            {ASSET_KIND_LABEL[kind]}
            {asset && (
              <>
                {' '}
                · <AssetStatusBadge statusId={asset.statusId} />
              </>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!isFaulty && asset && (
            <p className="mb-3 text-sm text-amber-700 dark:text-amber-300">
              This asset is not marked faulty. You can still open a repair or claim form below.
            </p>
          )}
          {loadingCtx ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading warranty…
            </p>
          ) : ctx?.warranty ? (
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li>
                <span className="font-medium text-foreground">Warranty on file</span> —{' '}
                {formatDateLabel(ctx.warranty.startDate)} → {formatDateLabel(ctx.warranty.endDate)}
                {ctx.isActive ? (
                  <span className="ml-2 text-emerald-600 dark:text-emerald-400">(active)</span>
                ) : (
                  <span className="ml-2 text-muted-foreground">(expired or not yet started)</span>
                )}
              </li>
              {ctx.warranty.remarks && <li>{ctx.warranty.remarks}</li>}
              {ctx.recentClaims.length > 0 && (
                <li className="pt-1">
                  {ctx.recentClaims.length} recent claim{ctx.recentClaims.length === 1 ? '' : 's'} on record
                </li>
              )}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              No vendor warranty recorded. Use in-house repair, or add warranty when registering new assets.
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2">
        <Card className="rounded-[14px] border-border shadow-sm">
          <CardHeader>
            <div className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-blue-500/10 text-blue-700 dark:text-blue-300">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <CardTitle className="text-base">Warranty claim</CardTitle>
            <CardDescription className="text-xs">
              Log a vendor claim while today falls within the warranty period. Multiple claims are allowed.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              className="w-full rounded-[8px]"
              disabled={!ctx?.isActive}
              asChild={ctx?.isActive === true}
            >
              {ctx?.isActive ? (
                <Link to="/technician/warranty" search={{ kind, assetId }}>
                  Open warranty claim form
                </Link>
              ) : (
                <span>Warranty not active</span>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card className="rounded-[14px] border-border shadow-sm">
          <CardHeader>
            <div className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-violet-500/10 text-violet-700 dark:text-violet-300">
              <Wrench className="h-5 w-5" />
            </div>
            <CardTitle className="text-base">In-house repair</CardTitle>
            <CardDescription className="text-xs">
              For assets with no warranty or expired coverage. Mark complete to restore active / online status.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="secondary" className="w-full rounded-[8px]" asChild>
              <Link to="/technician/repair" search={{ kind, assetId }}>
                Open repair form
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </TechnicianShell>
  );
}
