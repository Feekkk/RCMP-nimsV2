import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { readTechnicianSession } from '@/lib/auth-session';
import { formatDateLabel, normalizeToIsoDate } from '@/lib/date-format';
import type { OpenReturnContext } from '@/lib/deploy-return-schema';
import { ASSET_KIND_LABEL, ASSET_LIST_PATH, useAssets } from '@/hooks/assets';
import { Route } from '@/routes/technician/return';
import {
  getOpenReturnContextFn,
  returnLaptopPlaceFn,
  returnLaptopStaffFn,
  returnPlaceFn,
} from '@/server/deploy-return.functions';
import { TechnicianShell } from '@/technician/technician-shell';
import { ReturnDetailsFields } from '@/technician/deploy-return-fields';
import { STATUS_ID } from '@/lib/asset-status-actions';

function DeploymentSummary({ ctx }: { ctx: OpenReturnContext }) {
  if (ctx.kind === 'laptop') {
    const r = ctx.record;
    if (r.type === 'staff') {
      return (
        <ul className="space-y-1 text-sm text-muted-foreground">
          <li>
            <span className="font-medium text-foreground">Staff handover</span> — {r.recipientName} (
            {r.employeeNo})
          </li>
          <li>Handover date: {formatDateLabel(r.handoverDate)}</li>
          {r.handoverRemarks && <li>Remarks: {r.handoverRemarks}</li>}
        </ul>
      );
    }
    return (
      <ul className="space-y-1 text-sm text-muted-foreground">
        <li>
          <span className="font-medium text-foreground">Place deployment</span>
        </li>
        <li>Handover date: {formatDateLabel(r.handoverDate)}</li>
        {r.handoverRemarks && <li>Remarks: {r.handoverRemarks}</li>}
      </ul>
    );
  }

  const r = ctx.record;
  return (
    <ul className="space-y-1 text-sm text-muted-foreground">
      <li>
        {r.building} · Level {r.level} · Zone {r.zone}
      </li>
      <li>Deployed: {formatDateLabel(r.deploymentDate)}</li>
      {r.deploymentRemarks && <li>Remarks: {r.deploymentRemarks}</li>}
    </ul>
  );
}

export function TechnicianReturnPage() {
  const navigate = useNavigate();
  const { kind, assetId } = Route.useSearch();

  const laptop = useAssets('laptop');
  const av = useAssets('av');
  const network = useAssets('network');

  const [openCtx, setOpenCtx] = useState<OpenReturnContext | null>(null);
  const [loadingCtx, setLoadingCtx] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [returnDate, setReturnDate] = useState('');
  const [returnTime, setReturnTime] = useState('');
  const [returnPlace, setReturnPlace] = useState('');
  const [condition, setCondition] = useState('Good');
  const [returnRemarks, setReturnRemarks] = useState('');
  const [saving, setSaving] = useState(false);

  const asset = useMemo(() => {
    if (!kind || !assetId) return null;
    const items = kind === 'laptop' ? laptop.items : kind === 'av' ? av.items : network.items;
    return items.find((i) => i.assetId === assetId) ?? null;
  }, [kind, assetId, laptop.items, av.items, network.items]);

  const statusIsDeployed = asset?.statusId === STATUS_ID.DEPLOY;

  useEffect(() => {
    if (!kind || !assetId) {
      setLoadingCtx(false);
      setOpenCtx(null);
      setLoadError(null);
      return;
    }

    let cancelled = false;
    setLoadingCtx(true);
    setLoadError(null);

    void getOpenReturnContextFn({ data: { kind, assetId } })
      .then((ctx) => {
        if (!cancelled) setOpenCtx(ctx);
      })
      .catch((e) => {
        if (!cancelled) {
          setOpenCtx(null);
          setLoadError(e instanceof Error ? e.message : 'Failed to load deployment');
        }
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
        <p className="text-sm text-destructive">Invalid return link. Open return from an asset listing.</p>
        <Button variant="outline" className="mt-4 rounded-[8px]" asChild>
          <Link to="/technician/dashboard">Back to dashboard</Link>
        </Button>
      </TechnicianShell>
    );
  }

  const session = readTechnicianSession();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.staffId) {
      toast.error('Technician session required');
      return;
    }
    if (!openCtx) {
      toast.error('No open deployment to return');
      return;
    }

    const isoDate = normalizeToIsoDate(returnDate);
    if (!isoDate) {
      toast.error('Select a return date');
      return;
    }
    if (!condition) {
      toast.error('Select equipment condition');
      return;
    }

    setSaving(true);
    try {
      if (openCtx.kind === 'laptop') {
        const r = openCtx.record;
        if (r.type === 'staff') {
          await returnLaptopStaffFn({
            data: {
              handoverStaffId: r.handoverStaffId,
              returnedBy: session.staffId,
              returnDate: isoDate,
              returnTime: returnTime || null,
              returnPlace: returnPlace.trim() || null,
              condition,
              returnRemarks: returnRemarks.trim() || null,
            },
          });
        } else {
          await returnLaptopPlaceFn({
            data: {
              handoverId: r.handoverId,
              returnedBy: session.staffId,
              returnDate: isoDate,
              returnTime: returnTime || null,
              returnPlace: returnPlace.trim() || null,
              condition,
              returnRemarks: returnRemarks.trim() || null,
            },
          });
        }
      } else {
        await returnPlaceFn({
          data: {
            kind: openCtx.kind,
            deploymentId: openCtx.record.deploymentId,
            returnedBy: session.staffId,
            returnDate: isoDate,
            returnTime: returnTime || null,
            returnPlace: returnPlace.trim() || null,
            condition,
            returnRemarks: returnRemarks.trim() || null,
          },
        });
      }
      toast.success('Asset returned');
      void navigate({ to: ASSET_LIST_PATH[kind] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Return failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <TechnicianShell>
      <div className="mb-6">
        <Button variant="ghost" size="sm" className="-ml-2 mb-2 gap-1.5" asChild>
          <Link to={ASSET_LIST_PATH[kind]}>
            <ArrowLeft className="h-4 w-4" />
            Back to list
          </Link>
        </Button>
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Return asset</h1>
        <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
          {ASSET_KIND_LABEL[kind]} · Asset ID <code className="text-[11px]">{assetId}</code>
          {asset?.model ? ` · ${asset.model}` : ''}
        </p>
      </div>

      <Card className="mb-4 rounded-[14px] border-border shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Current deployment</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingCtx ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading deployment record…
            </p>
          ) : loadError ? (
            <p className="text-sm text-destructive">{loadError}</p>
          ) : openCtx ? (
            <DeploymentSummary ctx={openCtx} />
          ) : (
            <div className="space-y-2 text-sm text-destructive">
              <p>No open deployment record found for this asset.</p>
              {statusIsDeployed && (
                <p className="text-muted-foreground">
                  Status is &quot;deploy&quot; but there is no row in{' '}
                  {kind === 'laptop' ? 'handover' : kind === 'av' ? 'av_deployment' : 'network_deployment'}.
                  Use the Deploy form first, or fix status if it was changed manually.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-[14px] border-border shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Return details</CardTitle>
          <CardDescription>
            {kind === 'laptop'
              ? 'Saved to handover_return (staff or place handover).'
              : 'Saved to av_return or network_return.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <ReturnDetailsFields
                returnDate={returnDate}
                setReturnDate={setReturnDate}
                returnTime={returnTime}
                setReturnTime={setReturnTime}
                returnPlace={returnPlace}
                setReturnPlace={setReturnPlace}
                condition={condition}
                setCondition={setCondition}
                returnRemarks={returnRemarks}
                setReturnRemarks={setReturnRemarks}
              />
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" className="rounded-[8px]" asChild>
                <Link to={ASSET_LIST_PATH[kind]}>Cancel</Link>
              </Button>
              <Button
                type="submit"
                className="rounded-[8px] bg-foreground text-background hover:opacity-90"
                disabled={saving || !openCtx || loadingCtx}
              >
                {saving ? 'Saving…' : 'Confirm return'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </TechnicianShell>
  );
}
