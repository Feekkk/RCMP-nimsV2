import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import {
  ArrowLeft,
  Building2,
  Check,
  ChevronRight,
  ClipboardCheck,
  Layers,
  Laptop,
  MapPin,
  Network,
  Tv,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { readTechnicianSession } from '@/lib/auth-session';
import { localDateToIso } from '@/lib/date-format';
import { ASSET_KIND_LABEL, type AssetKind } from '@/lib/inventory-schema';
import type {
  PmChecklistDetail,
  PmItemResult,
  PmLocationTree,
  PmPlaceAsset,
} from '@/lib/pm-schema';
import { cn } from '@/lib/utils';
import {
  createPmLogFn,
  getPmChecklistDetailFn,
  getPmLocationTreeFn,
  listPmAssetsAtPlaceFn,
} from '@/server/operations/pm.functions';
import { FormField } from '@/technician/deploy-return-fields';
import { TechnicianShell } from '@/technician/technician-shell';

type WizardStep = 0 | 1 | 2 | 3 | 4;

const STEPS = ['Building', 'Level', 'Room / zone', 'Assets', 'Checklist'] as const;

const KIND_ICON: Record<AssetKind, typeof Laptop> = {
  laptop: Laptop,
  av: Tv,
  network: Network,
};

function zoneKey(building: string, level: string) {
  return `${building}||${level}`;
}

function ProgressBar({ activeIndex }: { activeIndex: number }) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-1.5 text-[11px] sm:mb-5 sm:gap-2 sm:text-xs">
      {STEPS.map((label, i) => {
        const done = i < activeIndex;
        const active = i === activeIndex;
        return (
          <div key={label} className="flex items-center gap-1.5 sm:gap-2">
            {i > 0 && <span className="text-muted-foreground/50">›</span>}
            <span
              className={cn(
                'rounded-full px-2 py-0.5 font-medium',
                active && 'bg-lavender/20 text-[oklch(0.4_0.12_290)]',
                done && 'text-foreground',
                !active && !done && 'text-muted-foreground',
              )}
            >
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function ChoiceButton({
  selected,
  onClick,
  icon: Icon,
  title,
  subtitle,
}: {
  selected: boolean;
  onClick: () => void;
  icon: typeof Building2;
  title: string;
  subtitle?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-3 rounded-[12px] border p-3.5 text-left transition-colors',
        selected
          ? 'border-[oklch(0.55_0.14_290)]/50 bg-lavender/10 shadow-sm'
          : 'border-border bg-card hover:bg-muted/40',
      )}
    >
      <div
        className={cn(
          'flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px]',
          selected ? 'bg-lavender/25 text-[oklch(0.4_0.12_290)]' : 'bg-muted text-muted-foreground',
        )}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{title}</p>
        {subtitle && <p className="truncate text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      {selected && <Check className="h-4 w-4 shrink-0 text-[oklch(0.45_0.12_290)]" />}
    </button>
  );
}

function StepFooter({
  onBack,
  backHref,
  onNext,
  nextLabel = 'Continue',
  nextDisabled,
  nextIcon,
}: {
  onBack?: () => void;
  backHref?: string;
  onNext?: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
  nextIcon?: ReactNode;
}) {
  return (
    <div className="mt-6 flex items-center justify-between gap-3 border-t border-border pt-4">
      {backHref ? (
        <Button type="button" variant="outline" className="rounded-[8px] gap-1.5" asChild>
          <Link to="/technician/preventive-maintenance">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
        </Button>
      ) : (
        <Button type="button" variant="outline" className="rounded-[8px] gap-1.5" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
      )}
      {onNext && (
        <Button
          type="button"
          className="rounded-[8px] gap-1.5"
          disabled={nextDisabled}
          onClick={onNext}
        >
          {nextIcon}
          {nextLabel}
          {!nextIcon && <ChevronRight className="h-4 w-4" />}
        </Button>
      )}
    </div>
  );
}

function assetLabel(asset: PmPlaceAsset) {
  return [asset.brand, asset.model].filter(Boolean).join(' ') || `Asset #${asset.assetId}`;
}

export function PmFormPage() {
  const [step, setStep] = useState<WizardStep>(0);
  const [tree, setTree] = useState<PmLocationTree | null>(null);
  const [treeLoading, setTreeLoading] = useState(true);
  const [building, setBuilding] = useState('');
  const [level, setLevel] = useState('');
  const [zone, setZone] = useState('');
  const [assets, setAssets] = useState<PmPlaceAsset[]>([]);
  const [assetsLoading, setAssetsLoading] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<'all' | string>('all');
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [checklist, setChecklist] = useState<PmChecklistDetail | null>(null);
  const [checklistLoading, setChecklistLoading] = useState(false);
  const [checks, setChecks] = useState<Record<number, PmItemResult | null>>({});
  const [remarks, setRemarks] = useState('');
  const [saving, setSaving] = useState(false);

  const loadTree = useCallback(async () => {
    setTreeLoading(true);
    try {
      setTree(await getPmLocationTreeFn());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load locations');
    } finally {
      setTreeLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTree();
  }, [loadTree]);

  const levels = building && tree ? (tree.levelsByBuilding[building] ?? []) : [];
  const zones =
    building && level && tree
      ? (tree.zonesByBuildingLevel[zoneKey(building, level)] ?? [])
      : [];

  const selectedAsset = useMemo(
    () => assets.find((a) => `${a.kind}:${a.assetId}` === selectedAssetId) ?? null,
    [assets, selectedAssetId],
  );

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const a of assets) {
      if (a.category?.trim()) set.add(a.category.trim());
    }
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [assets]);

  const filteredAssets = useMemo(() => {
    if (categoryFilter === 'all') return assets;
    return assets.filter((a) => (a.category ?? '').trim() === categoryFilter);
  }, [assets, categoryFilter]);

  const checkedCount = checklist
    ? checklist.items.filter((item) => checks[item.itemId] != null).length
    : 0;
  const failCount = checklist
    ? checklist.items.filter((item) => checks[item.itemId] === 'fail').length
    : 0;
  const allChecked =
    checklist != null &&
    checklist.items.length > 0 &&
    checkedCount === checklist.items.length;

  const goBack = () => {
    if (step === 0) return;
    setStep((s) => (s - 1) as WizardStep);
  };

  const pickBuilding = (next: string) => {
    setBuilding(next);
    setLevel('');
    setZone('');
    setAssets([]);
    setCategoryFilter('all');
    setSelectedAssetId(null);
    setChecklist(null);
    setChecks({});
    setRemarks('');
  };

  const pickLevel = (next: string) => {
    setLevel(next);
    setZone('');
    setAssets([]);
    setCategoryFilter('all');
    setSelectedAssetId(null);
    setChecklist(null);
    setChecks({});
    setRemarks('');
  };

  const pickZone = (next: string) => {
    setZone(next);
    setAssets([]);
    setCategoryFilter('all');
    setSelectedAssetId(null);
    setChecklist(null);
    setChecks({});
    setRemarks('');
  };

  const loadAssets = async () => {
    setAssetsLoading(true);
    try {
      const rows = await listPmAssetsAtPlaceFn({
        data: { building, level, zone },
      });
      setAssets(rows);
      setStep(3);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load assets');
    } finally {
      setAssetsLoading(false);
    }
  };

  const pickAsset = async (asset: PmPlaceAsset) => {
    const key = `${asset.kind}:${asset.assetId}`;
    setSelectedAssetId(key);
    setChecks({});
    setRemarks('');
    if (!asset.checklistId) {
      setChecklist(null);
      toast.error(
        `No checklist for ${asset.category ?? 'this category'}. Add one under Manage checklists.`,
      );
      return;
    }
    setChecklistLoading(true);
    try {
      const detail = await getPmChecklistDetailFn({ data: asset.checklistId });
      setChecklist(detail);
    } catch (e) {
      setChecklist(null);
      toast.error(e instanceof Error ? e.message : 'Failed to load checklist');
    } finally {
      setChecklistLoading(false);
    }
  };

  const setItemStatus = (itemId: number, status: PmItemResult) => {
    setChecks((prev) => ({
      ...prev,
      [itemId]: prev[itemId] === status ? null : status,
    }));
  };

  const handleSubmit = async () => {
    if (!selectedAsset || !checklist || !allChecked) {
      toast.error('Complete every checklist item before saving');
      return;
    }
    const session = readTechnicianSession();
    if (!session?.staffId) {
      toast.error('Your technician session could not be verified. Sign out and sign in again.');
      return;
    }

    setSaving(true);
    try {
      const result = await createPmLogFn({
        data: {
          assetId: selectedAsset.assetId,
          assetType: selectedAsset.kind,
          checklistId: checklist.checklistId,
          performedBy: session.staffId,
          pmDate: localDateToIso(new Date()),
          remarks: remarks.trim() || null,
          items: checklist.items.map((item) => ({
            itemId: item.itemId,
            result: checks[item.itemId]!,
          })),
        },
      });
      toast.success(
        result.status === 'passed'
          ? 'Maintenance checklist saved as passed'
          : `Maintenance checklist saved (${result.status})`,
      );
      setSelectedAssetId(null);
      setChecklist(null);
      setChecks({});
      setRemarks('');
      setCategoryFilter('all');
      setStep(3);
      void loadAssets();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not save checklist');
    } finally {
      setSaving(false);
    }
  };

  return (
    <TechnicianShell>
      <div className="mb-4 sm:mb-5">
        <Button variant="ghost" size="sm" type="button" className="-ml-2 mb-2 gap-1.5" asChild>
          <Link to="/technician/preventive-maintenance">
            <ArrowLeft className="h-4 w-4" />
            Exit
          </Link>
        </Button>
        <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
          Run maintenance
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Step {step + 1} of {STEPS.length} · {STEPS[step]}
        </p>
      </div>

      <ProgressBar activeIndex={step} />

      {step === 0 && (
        <Card className="rounded-[14px] border-border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Select building</CardTitle>
            <CardDescription>
              Buildings with currently deployed / placed assets
            </CardDescription>
          </CardHeader>
          <CardContent>
            {treeLoading ? (
              <p className="py-10 text-center text-sm text-muted-foreground">Loading locations…</p>
            ) : !tree || tree.buildings.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                No deployed assets with building / level / zone found.
              </p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-3">
                {tree.buildings.map((b) => (
                  <ChoiceButton
                    key={b}
                    selected={building === b}
                    onClick={() => pickBuilding(b)}
                    icon={Building2}
                    title={b}
                    subtitle={`${tree.levelsByBuilding[b]?.length ?? 0} levels`}
                  />
                ))}
              </div>
            )}
            <StepFooter
              backHref="/technician/preventive-maintenance"
              onNext={() => setStep(1)}
              nextDisabled={!building}
            />
          </CardContent>
        </Card>
      )}

      {step === 1 && (
        <Card className="rounded-[14px] border-border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Select level</CardTitle>
            <CardDescription className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" />
              {building}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 sm:grid-cols-2">
              {levels.map((l) => (
                <ChoiceButton
                  key={l}
                  selected={level === l}
                  onClick={() => pickLevel(l)}
                  icon={Layers}
                  title={l}
                  subtitle={`${tree?.zonesByBuildingLevel[zoneKey(building, l)]?.length ?? 0} rooms / zones`}
                />
              ))}
            </div>
            <StepFooter onBack={goBack} onNext={() => setStep(2)} nextDisabled={!level} />
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card className="rounded-[14px] border-border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Select room / zone</CardTitle>
            <CardDescription className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" />
              {building} · {level}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 sm:grid-cols-2">
              {zones.map((z) => (
                <ChoiceButton
                  key={z}
                  selected={zone === z}
                  onClick={() => pickZone(z)}
                  icon={MapPin}
                  title={z}
                />
              ))}
            </div>
            <StepFooter
              onBack={goBack}
              onNext={() => void loadAssets()}
              nextDisabled={!zone || assetsLoading}
              nextLabel={assetsLoading ? 'Loading…' : 'Continue'}
            />
          </CardContent>
        </Card>
      )}

      {step === 3 && (
        <Card className="rounded-[14px] border-border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Select asset</CardTitle>
            <CardDescription className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" />
              {building} · {level} · {zone}
              <span className="text-muted-foreground">
                · {assets.length} asset{assets.length === 1 ? '' : 's'}
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setCategoryFilter('all')}
                className={cn(
                  'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                  categoryFilter === 'all'
                    ? 'border-[oklch(0.45_0.12_290)]/40 bg-lavender/20 text-[oklch(0.4_0.12_290)]'
                    : 'border-border bg-background text-muted-foreground hover:bg-muted',
                )}
              >
                All ({assets.length})
              </button>
              {categories.map((cat) => {
                const count = assets.filter((a) => (a.category ?? '').trim() === cat).length;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategoryFilter(cat)}
                    className={cn(
                      'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                      categoryFilter === cat
                        ? 'border-[oklch(0.45_0.12_290)]/40 bg-lavender/20 text-[oklch(0.4_0.12_290)]'
                        : 'border-border bg-background text-muted-foreground hover:bg-muted',
                    )}
                  >
                    {cat} ({count})
                  </button>
                );
              })}
            </div>

            {filteredAssets.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                No assets in this room for the selected category.
              </p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {filteredAssets.map((asset) => {
                  const Icon = KIND_ICON[asset.kind];
                  const key = `${asset.kind}:${asset.assetId}`;
                  const active = selectedAssetId === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => void pickAsset(asset)}
                      className={cn(
                        'rounded-[12px] border p-3 text-left transition-colors',
                        active
                          ? 'border-[oklch(0.55_0.14_290)]/50 bg-lavender/10 shadow-sm'
                          : 'border-border bg-card hover:bg-muted/40',
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-muted">
                          <Icon className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{assetLabel(asset)}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {asset.serialNum ?? `#${asset.assetId}`}
                          </p>
                          <div className="mt-2 flex flex-wrap gap-1">
                            <Badge variant="secondary" className="rounded-[6px] text-[10px]">
                              {ASSET_KIND_LABEL[asset.kind]}
                            </Badge>
                            {asset.category && (
                              <Badge variant="secondary" className="rounded-[6px] text-[10px]">
                                {asset.category}
                              </Badge>
                            )}
                            {!asset.checklistId && (
                              <Badge
                                variant="outline"
                                className="rounded-[6px] text-[10px] text-amber-700"
                              >
                                No checklist
                              </Badge>
                            )}
                          </div>
                        </div>
                        {active && (
                          <Check className="h-4 w-4 shrink-0 text-[oklch(0.45_0.12_290)]" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            <StepFooter
              onBack={goBack}
              onNext={() => setStep(4)}
              nextDisabled={!selectedAssetId || !checklist || checklistLoading}
              nextLabel={checklistLoading ? 'Loading…' : 'Start checklist'}
            />
          </CardContent>
        </Card>
      )}

      {step === 4 && selectedAsset && checklist && (
        <Card className="rounded-[14px] border-border shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle className="text-base">{checklist.checklistName}</CardTitle>
                <CardDescription>
                  {assetLabel(selectedAsset)} · {selectedAsset.serialNum ?? `#${selectedAsset.assetId}`}
                </CardDescription>
              </div>
              <p className="text-xs tabular-nums text-muted-foreground sm:pt-1">
                {checkedCount}/{checklist.items.length} checked
                {failCount > 0 && ` · ${failCount} issue${failCount === 1 ? '' : 's'}`}
              </p>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="divide-y divide-border rounded-[12px] border border-border">
              {checklist.items.map((item) => {
                const status = checks[item.itemId] ?? null;
                return (
                  <li
                    key={item.itemId}
                    className="flex flex-col gap-2 px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <p className="text-sm">{item.itemDescription}</p>
                    <div className="flex shrink-0 gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant={status === 'pass' ? 'default' : 'outline'}
                        className={cn(
                          'h-8 rounded-[8px] gap-1 px-2.5',
                          status === 'pass' &&
                            'bg-emerald-600 hover:bg-emerald-600/90 dark:bg-emerald-700',
                        )}
                        onClick={() => setItemStatus(item.itemId, 'pass')}
                      >
                        <Check className="h-3.5 w-3.5" />
                        Pass
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant={status === 'fail' ? 'default' : 'outline'}
                        className={cn(
                          'h-8 rounded-[8px] gap-1 px-2.5',
                          status === 'fail' &&
                            'bg-red-600 hover:bg-red-600/90 dark:bg-red-700',
                        )}
                        onClick={() => setItemStatus(item.itemId, 'fail')}
                      >
                        <X className="h-3.5 w-3.5" />
                        Fail
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant={status === 'na' ? 'default' : 'outline'}
                        className={cn(
                          'h-8 rounded-[8px] px-2.5',
                          status === 'na' &&
                            'bg-yellow-500 text-yellow-950 hover:bg-yellow-500/90 dark:bg-yellow-600 dark:text-yellow-50',
                        )}
                        onClick={() => setItemStatus(item.itemId, 'na')}
                      >
                        N/A
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>

            <FormField label="Remarks">
              <Textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Optional notes for this maintenance visit…"
                className="min-h-[72px] rounded-[8px]"
              />
            </FormField>

            <StepFooter
              onBack={goBack}
              onNext={() => void handleSubmit()}
              nextLabel={saving ? 'Saving…' : 'Save checklist'}
              nextDisabled={!allChecked || saving}
              nextIcon={<ClipboardCheck className="h-4 w-4" />}
            />
          </CardContent>
        </Card>
      )}
    </TechnicianShell>
  );
}
