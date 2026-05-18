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
import type { DeployReturnSearch } from '@/lib/deploy-return-schema';
import type { StaffRecipient } from '@/lib/deploy-return-schema';
import { ASSET_KIND_LABEL, ASSET_LIST_PATH, useAssets } from '@/hooks/assets';
import {
  deployLaptopPlaceFn,
  deployLaptopStaffFn,
  deployPlaceFn,
} from '@/server/deploy-return.functions';
import { TechnicianShell } from '@/technician/technician-shell';
import { DatePickerField, FormField } from '@/technician/deploy-return-fields';
import { StaffRecipientSearch } from '@/technician/staff-recipient-search';

type LaptopDeployMode = 'staff' | 'place';

function parseSearch(search: Record<string, unknown>): DeployReturnSearch | null {
  const kind = search.kind;
  const assetId = Number(search.assetId);
  if ((kind !== 'laptop' && kind !== 'av' && kind !== 'network') || Number.isNaN(assetId) || assetId <= 0) {
    return null;
  }
  return { kind, assetId };
}

export function TechnicianDeployPage() {
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as Record<string, unknown>;
  const params = parseSearch(search);

  const laptop = useAssets('laptop');
  const av = useAssets('av');
  const network = useAssets('network');

  const asset = useMemo(() => {
    if (!params) return null;
    const items =
      params.kind === 'laptop' ? laptop.items : params.kind === 'av' ? av.items : network.items;
    return items.find((i) => i.assetId === params.assetId) ?? null;
  }, [params, laptop.items, av.items, network.items]);

  const [laptopMode, setLaptopMode] = useState<LaptopDeployMode>('staff');
  const [recipient, setRecipient] = useState<StaffRecipient | null>(null);
  const [handoverDate, setHandoverDate] = useState('');
  const [handoverRemarks, setHandoverRemarks] = useState('');
  const [building, setBuilding] = useState('');
  const [level, setLevel] = useState('');
  const [zone, setZone] = useState('');
  const [deploymentDate, setDeploymentDate] = useState('');
  const [deploymentRemarks, setDeploymentRemarks] = useState('');
  const [saving, setSaving] = useState(false);

  if (!params) {
    return (
      <TechnicianShell>
        <p className="text-sm text-destructive">Invalid deploy link. Open deploy from an asset listing.</p>
        <Button variant="outline" className="mt-4 rounded-[8px]" asChild>
          <Link to="/technician/dashboard">Back to dashboard</Link>
        </Button>
      </TechnicianShell>
    );
  }

  const { kind, assetId } = params;
  const session = readTechnicianSession();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.staffId) {
      toast.error('Technician session required');
      return;
    }

    setSaving(true);
    try {
      if (kind === 'laptop') {
        const isoDate = normalizeToIsoDate(handoverDate);
        if (!isoDate) {
          toast.error('Select a handover date');
          setSaving(false);
          return;
        }
        if (laptopMode === 'staff') {
          if (!recipient) {
            toast.error('Select a staff recipient');
            setSaving(false);
            return;
          }
          await deployLaptopStaffFn({
            data: {
              assetId,
              staffId: session.staffId,
              employeeNo: recipient.employeeNo,
              handoverDate: isoDate,
              handoverRemarks: handoverRemarks.trim() || null,
            },
          });
        } else {
          await deployLaptopPlaceFn({
            data: {
              assetId,
              staffId: session.staffId,
              handoverDate: isoDate,
              handoverRemarks: handoverRemarks.trim() || null,
            },
          });
        }
      } else {
        const isoDate = normalizeToIsoDate(deploymentDate);
        if (!isoDate) {
          toast.error('Select a deployment date');
          setSaving(false);
          return;
        }
        if (!building.trim() || !level.trim() || !zone.trim()) {
          toast.error('Building, level, and zone are required');
          setSaving(false);
          return;
        }
        await deployPlaceFn({
          data: {
            kind,
            assetId,
            staffId: session.staffId,
            building: building.trim(),
            level: level.trim(),
            zone: zone.trim(),
            deploymentDate: isoDate,
            deploymentRemarks: deploymentRemarks.trim() || null,
          },
        });
      }
      toast.success('Asset deployed');
      void navigate({ to: ASSET_LIST_PATH[kind] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Deploy failed');
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
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Deploy asset</h1>
        <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
          {ASSET_KIND_LABEL[kind]} · Asset ID <code className="text-[11px]">{assetId}</code>
          {asset?.model ? ` · ${asset.model}` : ''}
        </p>
      </div>

      <Card className="rounded-[14px] border-border shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Deployment details</CardTitle>
          <CardDescription>
            {kind === 'laptop'
              ? 'Handover to staff (handover + handover_staff) or deploy to a place (handover only).'
              : 'Record location deployment (building / level / zone).'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {kind === 'laptop' ? (
              <>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant={laptopMode === 'staff' ? 'default' : 'outline'}
                    size="sm"
                    className="rounded-[8px]"
                    onClick={() => setLaptopMode('staff')}
                  >
                    Handover to staff
                  </Button>
                  <Button
                    type="button"
                    variant={laptopMode === 'place' ? 'default' : 'outline'}
                    size="sm"
                    className="rounded-[8px]"
                    onClick={() => setLaptopMode('place')}
                  >
                    Deploy to place
                  </Button>
                </div>

                {laptopMode === 'staff' && (
                  <FormField label="Recipient (staff directory)" required>
                    <StaffRecipientSearch value={recipient} onSelect={setRecipient} />
                  </FormField>
                )}

                <div className="grid gap-4 sm:grid-cols-2">
                  <DatePickerField
                    label="Handover date"
                    value={handoverDate}
                    onChange={setHandoverDate}
                    required
                  />
                  <FormField label="Handover remarks">
                    <Textarea
                      value={handoverRemarks}
                      onChange={(e) => setHandoverRemarks(e.target.value)}
                      placeholder={
                        laptopMode === 'place'
                          ? 'Location / room / site details'
                          : 'Optional notes'
                      }
                      className="min-h-[80px] rounded-[8px]"
                    />
                  </FormField>
                </div>
              </>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="Building" required>
                  <Input
                    value={building}
                    onChange={(e) => setBuilding(e.target.value)}
                    required
                    className="rounded-[8px]"
                  />
                </FormField>
                <FormField label="Level" required>
                  <Input value={level} onChange={(e) => setLevel(e.target.value)} required className="rounded-[8px]" />
                </FormField>
                <FormField label="Zone" required>
                  <Input value={zone} onChange={(e) => setZone(e.target.value)} required className="rounded-[8px]" />
                </FormField>
                <DatePickerField
                  label="Deployment date"
                  value={deploymentDate}
                  onChange={setDeploymentDate}
                  required
                />
                <FormField label="Deployment remarks" >
                  <Textarea
                    value={deploymentRemarks}
                    onChange={(e) => setDeploymentRemarks(e.target.value)}
                    className="min-h-[80px] rounded-[8px] sm:col-span-2"
                  />
                </FormField>
              </div>
            )}

            <div className="flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" className="rounded-[8px]" asChild>
                <Link to={ASSET_LIST_PATH[kind]}>Cancel</Link>
              </Button>
              <Button
                type="submit"
                className="rounded-[8px] bg-foreground text-background hover:opacity-90"
                disabled={saving}
              >
                {saving ? 'Saving…' : 'Confirm deploy'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </TechnicianShell>
  );
}
