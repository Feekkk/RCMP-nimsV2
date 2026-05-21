import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearch } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { readTechnicianSession } from '@/lib/auth-session';
import { normalizeToIsoDate } from '@/lib/date-format';
import { ASSET_KIND_LABEL, ASSET_LIST_PATH, useAssets } from '@/hooks/assets';
import { parseFaultyAssetRouteSearch } from '@/lib/warranty-repair-schema';
import { createRepairFn } from '@/server/warranty-repair.functions';
import { TechnicianShell } from '@/technician/technician-shell';
import { DatePickerField, FormField } from '@/technician/deploy-return-fields';

export function TechnicianRepairFormPage() {
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as Record<string, unknown>;
  const params = parseFaultyAssetRouteSearch(search);
  const kind = params?.kind;
  const assetId = params?.assetId;

  const laptop = useAssets('laptop');
  const av = useAssets('av');
  const network = useAssets('network');

  const [repairDate, setRepairDate] = useState('');
  const [issueSummary, setIssueSummary] = useState('');
  const [repairRemarks, setRepairRemarks] = useState('');
  const [saving, setSaving] = useState(false);

  const asset = useMemo(() => {
    if (!kind || !assetId) return null;
    const items = kind === 'laptop' ? laptop.items : kind === 'av' ? av.items : network.items;
    return items.find((i) => i.assetId === assetId) ?? null;
  }, [kind, assetId, laptop.items, av.items, network.items]);

  const refreshAssets = () => {
    void laptop.refetch();
    void av.refetch();
    void network.refetch();
  };

  if (!kind || !assetId) {
    return (
      <TechnicianShell>
        <p className="text-sm text-destructive">Invalid repair link.</p>
        <Button variant="outline" className="mt-4 rounded-[8px]" asChild>
          <Link to="/technician/dashboard">Dashboard</Link>
        </Button>
      </TechnicianShell>
    );
  }

  const session = readTechnicianSession();
  const restoreLabel = kind === 'network' ? 'online' : 'active';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.staffId) {
      toast.error('Technician session required');
      return;
    }
    const isoRepair = normalizeToIsoDate(repairDate);
    if (!isoRepair) {
      toast.error('Repair date is required');
      return;
    }
    if (!issueSummary.trim()) {
      toast.error('Issue summary is required');
      return;
    }

    setSaving(true);
    try {
      const result = await createRepairFn({
        data: {
          kind,
          assetId,
          repairDate: isoRepair,
          issueSummary: issueSummary.trim(),
          repairRemarks: repairRemarks.trim() || null,
          staffId: session.staffId,
        },
      });
      toast.success(
        result.statusRestored
          ? `Repair logged — asset set to ${restoreLabel}`
          : 'Repair logged',
      );
      refreshAssets();
      void navigate({ to: ASSET_LIST_PATH[kind] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save repair');
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
        <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">In-house repair</h1>
        <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
          {ASSET_KIND_LABEL[kind]} · Asset {assetId}
          {asset ? ` · ${asset.brand ?? ''} ${asset.model ?? ''}`.trim() : ''}
        </p>
      </div>

      <Card className="rounded-[14px] border-border shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Log repair</CardTitle>
          <CardDescription>
            Saving completes the repair and restores the asset to {restoreLabel} when it is faulty.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <DatePickerField
              label="Repair date (repair_date)"
              value={repairDate}
              onChange={setRepairDate}
              required
            />
            <FormField label="Issue summary (issue_summary)" required>
              <Input
                value={issueSummary}
                onChange={(e) => setIssueSummary(e.target.value)}
                maxLength={255}
                required
                className="rounded-[8px]"
              />
            </FormField>
            <FormField label="Repair remarks (repair_remarks)">
              <Textarea
                value={repairRemarks}
                onChange={(e) => setRepairRemarks(e.target.value)}
                className="min-h-[80px] rounded-[8px]"
              />
            </FormField>

            <div className="flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" className="rounded-[8px]" asChild>
                <Link to={ASSET_LIST_PATH[kind]}>Cancel</Link>
              </Button>
              <Button
                type="submit"
                className="rounded-[8px] bg-foreground text-background hover:opacity-90"
                disabled={saving}
              >
                {saving ? 'Saving…' : 'Save repair'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </TechnicianShell>
  );
}
