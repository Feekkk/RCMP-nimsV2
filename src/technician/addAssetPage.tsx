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
import { TechnicianShell } from '@/technician/technician-shell';
import {
  ASSET_KIND_LABEL,
  ASSET_LIST_PATH,
  type AssetKind,
  type AvCategory,
  type CreateAvInput,
  type CreateLaptopInput,
  type CreateNetworkInput,
  type LaptopFormFactor,
  type NetworkCategory,
  type StockStatus,
  useAssets,
} from '@/hooks/assets';

type AddAssetSearch = { kind?: AssetKind };

const KIND_OPTIONS: { kind: AssetKind; icon: typeof Laptop; description: string }[] = [
  { kind: 'laptop', icon: Laptop, description: 'Laptops, desktops, specs & OS' },
  { kind: 'av', icon: Tv, description: 'Displays, projectors, audio, cameras' },
  { kind: 'network', icon: Network, description: 'Switches, routers, firewalls, APs' },
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
            Choose the inventory category for the asset you want to add.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          {KIND_OPTIONS.map(({ kind: k, icon: Icon, description }) => (
            <Card
              key={k}
              className="rounded-[14px] border-border/80 transition-shadow hover:border-lavender/40 hover:shadow-md"
            >
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
  createLaptop: (input: CreateLaptopInput) => void;
  createAv: (input: CreateAvInput) => void;
  createNetwork: (input: CreateNetworkInput) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [model, setModel] = useState('');
  const [assetTag, setAssetTag] = useState('');
  const [serial, setSerial] = useState('');
  const [location, setLocation] = useState('');
  const [status, setStatus] = useState<StockStatus>('in_stock');

  const [formFactor, setFormFactor] = useState<LaptopFormFactor>('laptop');
  const [cpu, setCpu] = useState('');
  const [ramGb, setRamGb] = useState('16');
  const [storageGb, setStorageGb] = useState('512');
  const [os, setOs] = useState('Windows 11');

  const [avCategory, setAvCategory] = useState<AvCategory>('display');
  const [resolution, setResolution] = useState('');
  const [hdmiPorts, setHdmiPorts] = useState('2');
  const [wattage, setWattage] = useState('');

  const [netCategory, setNetCategory] = useState<NetworkCategory>('switch');
  const [portCount, setPortCount] = useState('24');
  const [firmware, setFirmware] = useState('');
  const [ipAddress, setIpAddress] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!model.trim() || !assetTag.trim() || !serial.trim() || !location.trim()) {
      toast.error('Model, asset tag, serial, and location are required');
      return;
    }

    setSaving(true);

    try {
      if (kind === 'laptop') {
        if (!cpu.trim()) {
          toast.error('CPU is required');
          setSaving(false);
          return;
        }
        createLaptop({
          formFactor,
          model: model.trim(),
          assetTag: assetTag.trim(),
          serial: serial.trim(),
          location: location.trim(),
          status,
          cpu: cpu.trim(),
          ramGb: Number(ramGb) || 16,
          storageGb: Number(storageGb) || 512,
          os: os.trim(),
        });
      } else if (kind === 'av') {
        if (!resolution.trim()) {
          toast.error('Resolution is required');
          setSaving(false);
          return;
        }
        createAv({
          category: avCategory,
          model: model.trim(),
          assetTag: assetTag.trim(),
          serial: serial.trim(),
          location: location.trim(),
          status,
          resolution: resolution.trim(),
          hdmiPorts: Number(hdmiPorts) || 0,
          wattage: avCategory === 'projector' && wattage ? Number(wattage) : undefined,
        });
      } else {
        if (!firmware.trim() || !ipAddress.trim()) {
          toast.error('Firmware and IP address are required');
          setSaving(false);
          return;
        }
        createNetwork({
          category: netCategory,
          model: model.trim(),
          assetTag: assetTag.trim(),
          serial: serial.trim(),
          location: location.trim(),
          status,
          portCount: Number(portCount) || 1,
          firmware: firmware.trim(),
          ipAddress: ipAddress.trim(),
        });
      }
      onCreated(kind);
    } catch {
      toast.error('Could not save asset');
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
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">Single asset registration (demo)</p>
        </div>
        <Button variant="outline" size="sm" className="rounded-[8px]" asChild>
          <Link to={ASSET_LIST_PATH[kind]}>Cancel</Link>
        </Button>
      </div>

      <Card className="rounded-[14px] border-border shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Asset details</CardTitle>
          <CardDescription>Fields vary by category.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Model" required>
                <Input value={model} onChange={(e) => setModel(e.target.value)} required className="rounded-[8px]" />
              </Field>
              <Field label="Asset tag" required>
                <Input value={assetTag} onChange={(e) => setAssetTag(e.target.value)} required className="rounded-[8px]" />
              </Field>
              <Field label="Serial number" required>
                <Input value={serial} onChange={(e) => setSerial(e.target.value)} required className="rounded-[8px]" />
              </Field>
              <Field label="Location" required>
                <Input value={location} onChange={(e) => setLocation(e.target.value)} required className="rounded-[8px]" />
              </Field>
              <Field label="Stock status" required>
                <Select value={status} onValueChange={(v) => setStatus(v as StockStatus)}>
                  <SelectTrigger className="rounded-[8px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="in_stock">In stock</SelectItem>
                    <SelectItem value="out_of_stock">Out of stock</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>

            {kind === 'laptop' && (
              <section className="space-y-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Laptop / desktop specs</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Device type" required>
                    <Select value={formFactor} onValueChange={(v) => setFormFactor(v as LaptopFormFactor)}>
                      <SelectTrigger className="rounded-[8px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="laptop">Laptop</SelectItem>
                        <SelectItem value="desktop">Desktop</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Operating system" required>
                    <Input value={os} onChange={(e) => setOs(e.target.value)} required className="rounded-[8px]" />
                  </Field>
                  <Field label="CPU" required>
                    <Input value={cpu} onChange={(e) => setCpu(e.target.value)} required className="rounded-[8px]" />
                  </Field>
                  <Field label="RAM (GB)" required>
                    <Input type="number" min={4} value={ramGb} onChange={(e) => setRamGb(e.target.value)} required className="rounded-[8px]" />
                  </Field>
                  <Field label="Storage (GB)" required>
                    <Input type="number" min={128} value={storageGb} onChange={(e) => setStorageGb(e.target.value)} required className="rounded-[8px]" />
                  </Field>
                </div>
              </section>
            )}

            {kind === 'av' && (
              <section className="space-y-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">AV specifications</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="AV category" required>
                    <Select value={avCategory} onValueChange={(v) => setAvCategory(v as AvCategory)}>
                      <SelectTrigger className="rounded-[8px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="display">Display</SelectItem>
                        <SelectItem value="projector">Projector</SelectItem>
                        <SelectItem value="audio">Audio</SelectItem>
                        <SelectItem value="camera">Camera</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Resolution" required>
                    <Input value={resolution} onChange={(e) => setResolution(e.target.value)} required className="rounded-[8px]" />
                  </Field>
                  <Field label="HDMI ports" required>
                    <Input type="number" min={0} value={hdmiPorts} onChange={(e) => setHdmiPorts(e.target.value)} required className="rounded-[8px]" />
                  </Field>
                  <Field label="Wattage (projectors)">
                    <Input type="number" min={0} value={wattage} onChange={(e) => setWattage(e.target.value)} placeholder="Optional" className="rounded-[8px]" />
                  </Field>
                </div>
              </section>
            )}

            {kind === 'network' && (
              <section className="space-y-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Network specifications</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Device category" required>
                    <Select value={netCategory} onValueChange={(v) => setNetCategory(v as NetworkCategory)}>
                      <SelectTrigger className="rounded-[8px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="switch">Switch</SelectItem>
                        <SelectItem value="router">Router</SelectItem>
                        <SelectItem value="firewall">Firewall</SelectItem>
                        <SelectItem value="access_point">Access point</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Port count" required>
                    <Input type="number" min={1} value={portCount} onChange={(e) => setPortCount(e.target.value)} required className="rounded-[8px]" />
                  </Field>
                  <Field label="Firmware version" required>
                    <Input value={firmware} onChange={(e) => setFirmware(e.target.value)} required className="rounded-[8px]" />
                  </Field>
                  <Field label="IP address" required>
                    <Input value={ipAddress} onChange={(e) => setIpAddress(e.target.value)} required className="rounded-[8px]" />
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