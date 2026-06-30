import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearch } from '@tanstack/react-router';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { readTechnicianSession } from '@/lib/auth-session';
import { formatDateLabel, normalizeToIsoDate } from '@/lib/date-format';
import { ASSET_KIND_LABEL, ASSET_LIST_PATH, useAssets } from '@/hooks/assets';
import { createWarrantyClaimFn, getWarrantyContextFn } from '@/server/warranty-repair.functions';
import { parseFaultyAssetRouteSearch, type WarrantyContext } from '@/lib/warranty-repair-schema';
import { TechnicianShell } from '@/technician/technician-shell';
import { DatePickerField, FormField } from '@/technician/deploy-return-fields';

export function TechnicianWarrantyFormPage() {
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
  const [claimDate, setClaimDate] = useState('');
  const [claimTime, setClaimTime] = useState('');
  const [issueSummary, setIssueSummary] = useState('');
  const [claimRemarks, setClaimRemarks] = useState('');
  const [saving, setSaving] = useState(false);

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
        <p className="text-sm text-destructive">Invalid warranty link.</p>
        <Button variant="outline" className="mt-4 rounded-[8px]" asChild>
          <Link to="/technician/dashboard">Dashboard</Link>
        </Button>
      </TechnicianShell>
    );
  }

  const session = readTechnicianSession();
  const canClaim = ctx?.isActive === true;
  const restoreLabel = kind === 'network' ? 'online' : 'active';

  const refreshAssets = () => {
    void laptop.refetch();
    void av.refetch();
    void network.refetch();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.staffId) {
      toast.error('Your technician session could not be verified. Sign out and sign in again.');
      return;
    }
    if (!canClaim) {
      toast.error('Warranty is not active for this asset');
      return;
    }
    const isoClaim = normalizeToIsoDate(claimDate);
    if (!isoClaim) {
      toast.error('Claim date is required');
      return;
    }
    if (!issueSummary.trim()) {
      toast.error('Issue summary is required');
      return;
    }

    setSaving(true);
    try {
      const result = await createWarrantyClaimFn({
        data: {
          kind,
          assetId,
          claimDate: isoClaim,
          claimTime: claimTime.trim() || null,
          issueSummary: issueSummary.trim(),
          claimRemarks: claimRemarks.trim() || null,
          claimedBy: session.staffId,
        },
      });
      toast.success(
        result.statusRestored
          ? `Warranty claim logged — asset set to ${restoreLabel}`
          : 'Warranty claim logged',
      );
      refreshAssets();
      void navigate({ to: ASSET_LIST_PATH[kind] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save claim');
    } finally {
      setSaving(false);
    }
  };

  return (
    <TechnicianShell>
      <div className="mb-6">
        <Button variant="ghost" size="sm" type="button" className="-ml-2 mb-2 gap-1.5" asChild>
          <Link to="/technician/faulty" search={{ kind, assetId }}>
            <ArrowLeft className="h-4 w-4" />
            Faulty options
          </Link>
        </Button>
        <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">Warranty claim</h1>
        <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
          {ASSET_KIND_LABEL[kind]} · Asset {assetId}
          {asset ? ` · ${asset.brand ?? ''} ${asset.model ?? ''}`.trim() : ''}
        </p>
      </div>

      <Card className="rounded-[14px] border-border shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Coverage</CardTitle>
          <CardDescription>
            Claims are only accepted when the claim date falls within the recorded warranty period. Saving
            restores the asset to {restoreLabel} when it is faulty.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingCtx ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading…
            </p>
          ) : ctx?.warranty ? (
            <p className="text-sm text-muted-foreground">
              {formatDateLabel(ctx.warranty.startDate)} → {formatDateLabel(ctx.warranty.endDate)}
              {ctx.isActive ? (
                <span className="ml-2 font-medium text-emerald-600 dark:text-emerald-400">Active</span>
              ) : (
                <span className="ml-2 font-medium text-destructive">Not active</span>
              )}
            </p>
          ) : (
            <p className="text-sm text-destructive">No warranty on file for this asset.</p>
          )}
        </CardContent>
      </Card>

      <Card className="mt-4 rounded-[14px] border-border shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">New claim</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <DatePickerField
              label="Claim date (claim_date)"
              value={claimDate}
              onChange={setClaimDate}
              required
            />
            <FormField label="Claim time (claim_time)">
              <Input
                type="time"
                value={claimTime}
                onChange={(e) => setClaimTime(e.target.value)}
                className="rounded-[8px]"
              />
            </FormField>
            <FormField label="Issue summary (issue_summary)" required>
              <Input
                value={issueSummary}
                onChange={(e) => setIssueSummary(e.target.value)}
                maxLength={255}
                required
                className="rounded-[8px]"
              />
            </FormField>
            <FormField label="Claim remarks (claim_remarks)">
              <Textarea
                value={claimRemarks}
                onChange={(e) => setClaimRemarks(e.target.value)}
                className="min-h-[80px] rounded-[8px]"
              />
            </FormField>

            {ctx && ctx.recentClaims.length > 0 && (
              <div className="rounded-[8px] border border-border/80 bg-muted/30 p-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Recent claims
                </p>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  {ctx.recentClaims.map((c) => (
                    <li key={c.claimId}>
                      {formatDateLabel(c.claimDate)} — {c.issueSummary}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" className="rounded-[8px]" asChild>
                <Link to={ASSET_LIST_PATH[kind]}>Cancel</Link>
              </Button>
              <Button
                type="submit"
                className="rounded-[8px] bg-foreground text-background hover:opacity-90"
                disabled={saving || !canClaim}
              >
                {saving ? 'Saving…' : 'Log claim'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </TechnicianShell>
  );
}
