import { useState } from 'react';
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
import { TechnicianShell } from '@/technician/technician-shell';
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
  { kind: 'laptop', icon: Laptop, description: 'Laptop table — processor, memory, OS, storage' },
  { kind: 'av', icon: Tv, description: 'AV table — category, brand, model, serial' },
  { kind: 'network', icon: Network, description: 'Network table — MAC, IP, brand, model' },
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
            Choose a category. Records are saved to the MySQL tables in database/schema.sql.
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
  const [assetId, setAssetId] = useState('');
  const [model, setModel] = useState('');
  const [brand, setBrand] = useState('');
  const [serialNum, setSerialNum] = useState('');
  const [statusId, setStatusId] = useState('1');
  const [remarks, setRemarks] = useState('');

  const [category, setCategory] = useState('laptop');
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = Number(assetId);
    if (!assetId.trim() || Number.isNaN(id) || id <= 0) {
      toast.error('Asset ID is required (numeric, matches asset_id column)');
      return;
    }
    if (!model.trim()) {
      toast.error('Model is required');
      return;
    }

    const parsedStatusId = Number(statusId);
    if (Number.isNaN(parsedStatusId)) {
      toast.error('Select a valid status');
      return;
    }

    setSaving(true);
    try {
      if (kind === 'laptop') {
        await createLaptop({
          assetId: id,
          model: model.trim(),
          brand: brand.trim() || null,
          serialNum: serialNum.trim() || null,
          category: category.trim() || null,
          partNumber: partNumber.trim() || null,
          processor: processor.trim() || null,
          memory: memory.trim() || null,
          os: os.trim() || null,
          storage: storage.trim() || null,
          gpu: gpu.trim() || null,
          statusId: parsedStatusId,
          remarks: remarks.trim() || null,
        });
      } else if (kind === 'av') {
        await createAv({
          assetId: id,
          model: model.trim(),
          brand: brand.trim() || null,
          serialNum: serialNum.trim() || null,
          category: avCategory.trim() || null,
          assetIdOld: assetIdOld.trim() || null,
          statusId: parsedStatusId,
          remarks: remarks.trim() || null,
        });
      } else {
        await createNetwork({
          assetId: id,
          model: model.trim(),
          brand: brand.trim() || null,
          serialNum: serialNum.trim() || null,
          macAddress: macAddress.trim() || null,
          ipAddress: ipAddress.trim() || null,
          statusId: parsedStatusId,
          remarks: remarks.trim() || null,
        });
      }
      onCreated(kind);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not save asset';
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
            Inserts into the <code className="text-[11px]">{kind}</code> table (see database/schema.sql)
          </p>
        </div>
        <Button variant="outline" size="sm" className="rounded-[8px]" asChild>
          <Link to={ASSET_LIST_PATH[kind]}>Cancel</Link>
        </Button>
      </div>

      <Card className="rounded-[14px] border-border shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Asset details</CardTitle>
          <CardDescription>Fields match MySQL column names.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Asset ID (asset_id)" required>
                <Input
                  type="number"
                  min={1}
                  value={assetId}
                  onChange={(e) => setAssetId(e.target.value)}
                  required
                  className="rounded-[8px]"
                />
              </Field>
              <Field label="Status (status_id)" required>
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
              <Field label="Model" required>
                <Input value={model} onChange={(e) => setModel(e.target.value)} required className="rounded-[8px]" />
              </Field>
              <Field label="Brand">
                <Input value={brand} onChange={(e) => setBrand(e.target.value)} className="rounded-[8px]" />
              </Field>
              <Field label="Serial (serial_num)">
                <Input value={serialNum} onChange={(e) => setSerialNum(e.target.value)} className="rounded-[8px]" />
              </Field>
              <Field label="Remarks">
                <Textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} className="min-h-[72px] rounded-[8px]" />
              </Field>
            </div>

            {kind === 'laptop' && (
              <section className="space-y-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Laptop columns</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Category (e.g. laptop, desktop)">
                    <Input value={category} onChange={(e) => setCategory(e.target.value)} className="rounded-[8px]" />
                  </Field>
                  <Field label="Part number">
                    <Input value={partNumber} onChange={(e) => setPartNumber(e.target.value)} className="rounded-[8px]" />
                  </Field>
                  <Field label="Processor">
                    <Input value={processor} onChange={(e) => setProcessor(e.target.value)} className="rounded-[8px]" />
                  </Field>
                  <Field label="Memory">
                    <Input value={memory} onChange={(e) => setMemory(e.target.value)} placeholder="e.g. 16GB" className="rounded-[8px]" />
                  </Field>
                  <Field label="OS">
                    <Input value={os} onChange={(e) => setOs(e.target.value)} className="rounded-[8px]" />
                  </Field>
                  <Field label="Storage">
                    <Input value={storage} onChange={(e) => setStorage(e.target.value)} placeholder="e.g. 512GB" className="rounded-[8px]" />
                  </Field>
                  <Field label="GPU">
                    <Input value={gpu} onChange={(e) => setGpu(e.target.value)} className="rounded-[8px]" />
                  </Field>
                </div>
              </section>
            )}

            {kind === 'av' && (
              <section className="space-y-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">AV columns</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Category">
                    <Input
                      value={avCategory}
                      onChange={(e) => setAvCategory(e.target.value)}
                      placeholder="display, projector, audio…"
                      className="rounded-[8px]"
                    />
                  </Field>
                  <Field label="Legacy ID (asset_id_old)">
                    <Input value={assetIdOld} onChange={(e) => setAssetIdOld(e.target.value)} className="rounded-[8px]" />
                  </Field>
                </div>
              </section>
            )}

            {kind === 'network' && (
              <section className="space-y-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Network columns</p>
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