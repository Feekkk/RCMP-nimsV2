import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Link, useNavigate, useSearch } from '@tanstack/react-router';
import { ArrowLeft, Laptop, Network, Tv } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { INVENTORY_STATUSES } from '@/lib/inventory-schema';
import { STATUS_ID } from '@/lib/asset-status-actions';
import { readTechnicianSession } from '@/lib/auth-session';
import { normalizeToIsoDate } from '@/lib/date-format';
import type { StaffRecipient } from '@/lib/deploy-return-schema';
import { emptyPurchaseFormState, purchaseFormToInput } from '@/lib/purchase-field-utils';
import { emptyWarrantyFormState, warrantyFormToInput } from '@/lib/warranty-field-utils';
import {
  formatAssetIdDisplay,
  LAPTOP_CATEGORY_OPTIONS,
  useNextAssetId,
} from '@/hooks/assetid-generator';
import {
  bulkCreateAvImportFn,
  bulkCreateLaptopsImportFn,
  bulkCreateNetworkImportFn,
} from '@/server/assets.functions';
import { TechnicianShell } from '@/technician/technician-shell';
import { AddAssetDeployFields, type LaptopDeployMode } from '@/technician/add-asset-deploy-fields';
import { PurchaseFieldsSection } from '@/technician/asset-purchase-fields';
import { WarrantyFieldsSection } from '@/technician/warranty-fields';
import {
  ASSET_KIND_LABEL,
  ASSET_LIST_PATH,
  type AssetKind,
  type CreateAvInput,
  type CreateLaptopInput,
  type CreateNetworkInput,
  useAssets,
} from '@/hooks/assets';

type AddAssetSearch = { kind?: AssetKind };

const KIND_OPTIONS: { kind: AssetKind; icon: typeof Laptop; description: string }[] = [
  { kind: 'laptop', icon: Laptop, description: 'Full laptop table incl. PO / DO / invoice fields' },
  { kind: 'av', icon: Tv, description: 'Full av table incl. asset_id_old & procurement' },
  { kind: 'network', icon: Network, description: 'Full network table incl. MAC, IP & procurement' },
];

function isAssetKind(value: unknown): value is AssetKind {
  return value === 'laptop' || value === 'av' || value === 'network';
}

export function TechnicianAddAssetPage() {
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as AddAssetSearch;
  const presetKind = isAssetKind(search.kind) ? search.kind : undefined;

  const [selectedKind, setSelectedKind] = useState<AssetKind | null>(presetKind ?? null);
  const kind = selectedKind ?? presetKind ?? null;

  const laptop = useAssets('laptop');
  const av = useAssets('av');
  const network = useAssets('network');

  if (!kind) {
    return (
      <TechnicianShell>
        <div className="mb-6">
          <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">Register asset</h1>
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
            Choose a category to add the asset to the inventory system.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          {KIND_OPTIONS.map(({ kind: k, icon: Icon, description }) => (
            <Card key={k} className="rounded-[14px] border-border/80 shadow-sm">
              <CardHeader className="pb-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-lavender/15 text-[oklch(0.45_0.12_290)]">
                  <Icon className="h-5 w-5" />
                </div>
                <CardTitle className="text-base">{ASSET_KIND_LABEL[k]}</CardTitle>
                <CardDescription className="text-xs">{description}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-2 pt-0">
                <Button variant="outline" size="sm" className="w-full rounded-[8px]" asChild>
                  <Link to="/technician/add-asset" search={{ kind: k }}>
                    Single asset
                  </Link>
                </Button>
                <Button variant="secondary" size="sm" className="w-full rounded-[8px]" asChild>
                  <Link to="/technician/bulk-import" search={{ kind: k }}>
                    Bulk import
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </TechnicianShell>
    );
  }

  return (
    <TechnicianShell>
      <AssetForm
        kind={kind}
        onBack={() => {
          setSelectedKind(null);
          void navigate({ to: '/technician/add-asset', search: {} });
        }}
        onCreated={(createdKind) => {
          toast.success(`${ASSET_KIND_LABEL[createdKind]} registered`);
          void navigate({ to: ASSET_LIST_PATH[createdKind] });
        }}
        createLaptop={laptop.create}
        createAv={av.create}
        createNetwork={network.create}
      />
    </TechnicianShell>
  );
}

function AssetForm({
  kind,
  onBack,
  onCreated,
  createLaptop,
  createAv,
  createNetwork,
}: {
  kind: AssetKind;
  onBack: () => void;
  onCreated: (kind: AssetKind) => void;
  createLaptop: (input: CreateLaptopInput) => Promise<unknown>;
  createAv: (input: CreateAvInput) => Promise<unknown>;
  createNetwork: (input: CreateNetworkInput) => Promise<unknown>;
}) {
  const [saving, setSaving] = useState(false);
  const [model, setModel] = useState('');
  const [brand, setBrand] = useState('');
  const [serialNum, setSerialNum] = useState('');
  const [statusId, setStatusId] = useState('1');
  const [remarks, setRemarks] = useState('');
  const [purchase, setPurchase] = useState(emptyPurchaseFormState);
  const [warranty, setWarranty] = useState(emptyWarrantyFormState);

  const [category, setCategory] = useState<string>(LAPTOP_CATEGORY_OPTIONS[0]);
  const [partNumber, setPartNumber] = useState('');
  const [processor, setProcessor] = useState('');
  const [memory, setMemory] = useState('');
  const [os, setOs] = useState('');
  const [storage, setStorage] = useState('');
  const [gpu, setGpu] = useState('');

  const [assetIdOld, setAssetIdOld] = useState('');
  const [avCategory, setAvCategory] = useState('');

  const [macAddress, setMacAddress] = useState('');
  const [ipAddress, setIpAddress] = useState('');

  const [laptopDeployMode, setLaptopDeployMode] = useState<LaptopDeployMode>('staff');
  const [deployRecipient, setDeployRecipient] = useState<StaffRecipient | null>(null);
  const [handoverDate, setHandoverDate] = useState('');
  const [handoverRemarks, setHandoverRemarks] = useState('');
  const [deployBuilding, setDeployBuilding] = useState('');
  const [deployLevel, setDeployLevel] = useState('');
  const [deployZone, setDeployZone] = useState('');
  const [deploymentDate, setDeploymentDate] = useState('');
  const [deploymentRemarks, setDeploymentRemarks] = useState('');

  const isDeployStatus = statusId === String(STATUS_ID.DEPLOY);

  const {
    assetId: generatedAssetId,
    isLoading: assetIdLoading,
    error: assetIdError,
    refetch: refetchAssetId,
  } = useNextAssetId(kind, kind === 'laptop' ? category : undefined);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = await refetchAssetId();
    if (id == null || id <= 0) {
      toast.error(assetIdError ?? 'A new asset ID could not be generated. Try again or refresh the page.');
      return;
    }

    const parsedStatusId = Number(statusId);
    if (Number.isNaN(parsedStatusId)) {
      toast.error('Select a status for this asset before saving.');
      return;
    }

    const purchaseInput = purchaseFormToInput(purchase);
    const hasWarrantyPartial =
      Boolean(warranty.startDate.trim()) ||
      Boolean(warranty.endDate.trim()) ||
      Boolean(warranty.remarks.trim());
    const warrantyInput = warrantyFormToInput(warranty);
    if (hasWarrantyPartial && !warrantyInput) {
      toast.error('Warranty requires both a start date and an end date. Fill in both or leave warranty blank.');
      return;
    }

    let deployHandover: {
      handoverStaffEmail: string;
      handoverDate: string;
      handoverRemarks: string | null;
      employeeNo: string | null;
    } | null = null;
    let deployPlacement: {
      deploymentStaffEmail: string;
      building: string;
      level: string;
      zone: string;
      deploymentDate: string;
      deploymentRemarks: string | null;
    } | null = null;

    if (isDeployStatus) {
      const session = readTechnicianSession();
      if (!session?.email?.trim()) {
        toast.error('Your technician session could not be verified. Sign out and sign in again.');
        return;
      }
      const staffEmail = session.email.trim().toLowerCase();

      if (kind === 'laptop') {
        const isoHandoverDate = normalizeToIsoDate(handoverDate);
        if (!isoHandoverDate) {
          toast.error('Select a handover date');
          return;
        }
        if (laptopDeployMode === 'staff') {
          if (!deployRecipient) {
            toast.error('Select a staff recipient');
            return;
          }
          if (!deployRecipient.email?.trim().includes('@')) {
            toast.error('Selected staff has no email in the directory — add email before handover');
            return;
          }
        }
        deployHandover = {
          handoverStaffEmail: staffEmail,
          handoverDate: isoHandoverDate,
          handoverRemarks: handoverRemarks.trim() || null,
          employeeNo: laptopDeployMode === 'staff' ? deployRecipient!.employeeNo : null,
        };
      } else {
        const isoDeploymentDate = normalizeToIsoDate(deploymentDate);
        if (!isoDeploymentDate) {
          toast.error('Select a deployment date');
          return;
        }
        if (!deployBuilding.trim() || !deployLevel.trim() || !deployZone.trim()) {
          toast.error('Building, level, and zone are required');
          return;
        }
        deployPlacement = {
          deploymentStaffEmail: staffEmail,
          building: deployBuilding.trim(),
          level: deployLevel.trim(),
          zone: deployZone.trim(),
          deploymentDate: isoDeploymentDate,
          deploymentRemarks: deploymentRemarks.trim() || null,
        };
      }
    }

    setSaving(true);
    try {
      if (kind === 'laptop') {
        if (!serialNum.trim()) {
          toast.error('Serial number is required for laptops. Enter the device serial number.');
          setSaving(false);
          return;
        }
        if (!category.trim()) {
          toast.error('Category is required for laptops. Select or enter a category.');
          setSaving(false);
          return;
        }
        const laptopInput = {
          assetId: id,
          serialNum: serialNum.trim(),
          category: category.trim(),
          brand: brand.trim() || null,
          model: model.trim() || null,
          partNumber: partNumber.trim() || null,
          processor: processor.trim() || null,
          memory: memory.trim() || null,
          os: os.trim() || null,
          storage: storage.trim() || null,
          gpu: gpu.trim() || null,
          ...purchaseInput,
          statusId: parsedStatusId,
          remarks: remarks.trim() || null,
          warranty: warrantyInput,
        };
        if (isDeployStatus && deployHandover) {
          await bulkCreateLaptopsImportFn({ data: [{ ...laptopInput, handover: deployHandover }] });
        } else {
          await createLaptop(laptopInput);
        }
      } else if (kind === 'av') {
        if (!assetIdOld.trim()) {
          toast.error('Legacy asset ID is required for AV equipment. Enter the previous asset identifier.');
          setSaving(false);
          return;
        }
        const avInput = {
          assetId: id,
          assetIdOld: assetIdOld.trim(),
          category: avCategory.trim() || null,
          brand: brand.trim() || null,
          model: model.trim() || null,
          serialNum: serialNum.trim() || null,
          ...purchaseInput,
          statusId: parsedStatusId,
          remarks: remarks.trim() || null,
          warranty: warrantyInput,
        };
        if (isDeployStatus && deployPlacement) {
          await bulkCreateAvImportFn({ data: [{ ...avInput, deployment: deployPlacement }] });
        } else {
          await createAv(avInput);
        }
      } else {
        const networkInput = {
          assetId: id,
          serialNum: serialNum.trim() || null,
          brand: brand.trim() || null,
          model: model.trim() || null,
          macAddress: macAddress.trim() || null,
          ipAddress: ipAddress.trim() || null,
          ...purchaseInput,
          statusId: parsedStatusId,
          remarks: remarks.trim() || null,
          warranty: warrantyInput,
        };
        if (isDeployStatus && deployPlacement) {
          await bulkCreateNetworkImportFn({ data: [{ ...networkInput, deployment: deployPlacement }] });
        } else {
          await createNetwork(networkInput);
        }
      }
      onCreated(kind);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'The asset could not be saved. Try again.';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Button variant="ghost" size="sm" type="button" className="-ml-2 mb-2 gap-1.5" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
            Change category
          </Button>
          <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            Add {ASSET_KIND_LABEL[kind]}
          </h1>
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
            Maps to the <code className="text-[11px]">{kind}</code> table in database/schema.sql
          </p>
        </div>
        <Button variant="outline" size="sm" className="rounded-[8px]" asChild>
          <Link to={ASSET_LIST_PATH[kind]}>Cancel</Link>
        </Button>
      </div>

      <Card className="rounded-[14px] border-border shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Asset details</CardTitle>
          <CardDescription>Please fill in the required fields.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <section className="space-y-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Main Details</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Asset ID (auto-generated)">
                  <div className="flex h-10 items-center gap-2 rounded-[8px] border border-input bg-muted/40 px-3 font-mono text-sm">
                    {assetIdLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        <span className="text-muted-foreground">Checking database…</span>
                      </>
                    ) : generatedAssetId != null ? (
                      <>
                        <span>{generatedAssetId}</span>
                        <span className="text-muted-foreground">({formatAssetIdDisplay(generatedAssetId)})</span>
                      </>
                    ) : (
                      <span className="text-muted-foreground">
                        {kind === 'laptop' ? 'Select a category to generate ID' : 'Unavailable'}
                      </span>
                    )}
                  </div>
                </Field>
                <Field label="Choose status" required>
                  <Select value={statusId} onValueChange={setStatusId}>
                    <SelectTrigger className="rounded-[8px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {INVENTORY_STATUSES.map((s) => (
                        <SelectItem key={s.statusId} value={String(s.statusId)}>
                          {s.statusId} — {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Brand">
                  <Input value={brand} onChange={(e) => setBrand(e.target.value)} className="rounded-[8px]" placeholder="Lenovo, HP, Dell, etc." />
                </Field>
                <Field label="Model">
                  <Input value={model} onChange={(e) => setModel(e.target.value)} className="rounded-[8px]" placeholder="ThinkPad X1 Carbon, HP EliteBook 840 G8, etc." />
                </Field>
                <Field label="Serial number" required={kind === 'laptop'}>
                  <Input
                    value={serialNum}
                    onChange={(e) => setSerialNum(e.target.value)}
                    required={kind === 'laptop'}
                    className="rounded-[8px]"
                    placeholder="Enter serial number (e.g. LN1234567890)"
                  />
                </Field>
                <Field label="Remarks">
                  <Textarea
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    className="min-h-[72px] rounded-[8px]"
                    placeholder="Enter remarks (e.g. Laptop is used for development)"
                  />
                </Field>
              </div>
            </section>

            {isDeployStatus && (
              <AddAssetDeployFields
                kind={kind}
                laptopMode={laptopDeployMode}
                onLaptopModeChange={setLaptopDeployMode}
                recipient={deployRecipient}
                onRecipientChange={setDeployRecipient}
                handoverDate={handoverDate}
                onHandoverDateChange={setHandoverDate}
                handoverRemarks={handoverRemarks}
                onHandoverRemarksChange={setHandoverRemarks}
                building={deployBuilding}
                onBuildingChange={setDeployBuilding}
                level={deployLevel}
                onLevelChange={setDeployLevel}
                zone={deployZone}
                onZoneChange={setDeployZone}
                deploymentDate={deploymentDate}
                onDeploymentDateChange={setDeploymentDate}
                deploymentRemarks={deploymentRemarks}
                onDeploymentRemarksChange={setDeploymentRemarks}
              />
            )}

            {kind === 'laptop' && (
              <section className="space-y-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Laptop</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Category" required>
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger className="rounded-[8px]">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {LAPTOP_CATEGORY_OPTIONS.map((opt) => (
                          <SelectItem key={opt} value={opt}>
                            {opt}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Part number">
                    <Input value={partNumber} onChange={(e) => setPartNumber(e.target.value)} className="rounded-[8px]" placeholder="Enter part number (e.g. 1234567890)" />
                  </Field>
                  <Field label="Processor">
                    <Input value={processor} onChange={(e) => setProcessor(e.target.value)} className="rounded-[8px]" placeholder="Enter processor (e.g. Intel Core i5-1135G7)" />
                  </Field>
                  <Field label="Memory">
                    <Input value={memory} onChange={(e) => setMemory(e.target.value)} placeholder="Enter memory (e.g. 16GB)" className="rounded-[8px]" />
                  </Field>
                  <Field label="OS">
                    <Input value={os} onChange={(e) => setOs(e.target.value)} className="rounded-[8px]" placeholder="Enter OS (e.g. Windows 10)" />
                  </Field>
                  <Field label="Storage">
                    <Input value={storage} onChange={(e) => setStorage(e.target.value)} placeholder="Enter storage (e.g. 512GB)" className="rounded-[8px]" />
                  </Field>
                  <Field label="GPU">
                    <Input value={gpu} onChange={(e) => setGpu(e.target.value)} className="rounded-[8px]" placeholder="Enter GPU (e.g. Intel Iris Xe Graphics)" />
                  </Field>
                </div>
              </section>
            )}

            {kind === 'av' && (
              <section className="space-y-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">AV</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Legacy ID" required>
                    <Input value={assetIdOld} onChange={(e) => setAssetIdOld(e.target.value)} required className="rounded-[8px]" />
                  </Field>
                  <Field label="Category">
                    <Input
                      value={avCategory}
                      onChange={(e) => setAvCategory(e.target.value)}
                      placeholder="display, projector…"
                      className="rounded-[8px]"
                    />
                  </Field>
                </div>
              </section>
            )}

            {kind === 'network' && (
              <section className="space-y-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Network</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="MAC address">
                    <Input value={macAddress} onChange={(e) => setMacAddress(e.target.value)} className="rounded-[8px]" />
                  </Field>
                  <Field label="IP address">
                    <Input value={ipAddress} onChange={(e) => setIpAddress(e.target.value)} className="rounded-[8px]" />
                  </Field>
                </div>
              </section>
            )}

            <PurchaseFieldsSection values={purchase} onChange={(patch) => setPurchase((p) => ({ ...p, ...patch }))} />

            <WarrantyFieldsSection values={warranty} onChange={(patch) => setWarranty((w) => ({ ...w, ...patch }))} />

            <div className="flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" className="rounded-[8px]" asChild>
                <Link to={ASSET_LIST_PATH[kind]}>Cancel</Link>
              </Button>
              <Button
                type="submit"
                className="rounded-[8px] bg-foreground text-background hover:opacity-90"
                disabled={saving}
              >
                {saving ? 'Saving…' : 'Register asset'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </>
  );
}

function Field({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div className="space-y-2">
      <Label>
        {label}
        {required && <span className="text-destructive"> *</span>}
      </Label>
      {children}
    </div>
  );
}
