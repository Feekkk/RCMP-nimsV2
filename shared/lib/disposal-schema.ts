import type { AssetId, AssetKind } from '@shared/lib/inventory-schema';

export const PREDISPOSAL_REASONS = ['manual', 'return_from_deployment', 'lifespan_over_7y'] as const;
export type PredisposalReason = (typeof PREDISPOSAL_REASONS)[number];

export const PREDISPOSAL_REASON_LABEL: Record<PredisposalReason, string> = {
  manual: 'Manual',
  return_from_deployment: 'Return from deployment',
  lifespan_over_7y: 'Lifespan over 7 years',
};

export const LIFESPAN_PREDISPOSAL_YEARS = 7;
export const DISPOSAL_PUSAT_DEFAULT = 'JABATAN TEKNOLOGI MAKLUMAT';

export type PredisposalEligibleAsset = {
  kind: AssetKind;
  assetId: AssetId;
  assetIdOld: string | null;
  model: string | null;
  brand: string | null;
  category: string | null;
  serialNum: string | null;
  statusId: number;
  poDate: string | null;
  doDate: string | null;
};

export type PreDisposedAsset = PredisposalEligibleAsset & {
  preDisposalId: number;
  accCode: string | null;
  reason: PredisposalReason;
  predisposedAt: string | null;
  predisposedBy: string | null;
};

export type MarkPredisposedAssetInput = {
  kind: AssetKind;
  assetId: AssetId;
};

export type MarkAssetsPredisposedInput = {
  assets: MarkPredisposedAssetInput[];
};

export type MarkAssetsPredisposedResult = {
  updated: number;
  errors: string[];
};

export type RemoveAssetsFromPredisposalInput = MarkAssetsPredisposedInput;

export type RemoveAssetsFromPredisposalResult = MarkAssetsPredisposedResult;

export type DisposalDashboardStats = {
  pending: number;
  disposedThisMonth: number;
  disposedThisYear: number;
};

export type SubmitDisposalBatchAssetInput = MarkPredisposedAssetInput & {
  latarBelakang?: string | null;
  rekodFizikalHarta?: string | null;
  imageWholeAsset?: string | null;
  imageSerialNumber?: string | null;
};

export type SubmitDisposalBatchInput = {
  assets: SubmitDisposalBatchAssetInput[];
  disposalDate: string;
  disposalTime?: string | null;
  remarks?: string | null;
  pusat?: string | null;
};

export type DisposalBatchFormSearch = {
  assets: string;
};

export function serializeDisposalBatchAssets(assets: MarkPredisposedAssetInput[]): string {
  return assets.map((asset) => encodeURIComponent(`${asset.kind}|${asset.assetId}`)).join(',');
}

export function parseDisposalBatchAssets(raw: string | null | undefined): MarkPredisposedAssetInput[] {
  if (!raw?.trim()) return [];
  const seen = new Set<string>();
  const assets: MarkPredisposedAssetInput[] = [];
  for (const part of raw.split(',')) {
    let decoded = part.trim();
    if (!decoded) continue;
    try {
      decoded = decodeURIComponent(decoded);
    } catch {
      continue;
    }
    const sep = decoded.indexOf('|');
    if (sep <= 0) continue;
    const kind = decoded.slice(0, sep);
    const assetId = decoded.slice(sep + 1).trim();
    if (kind !== 'laptop' && kind !== 'av' && kind !== 'network') continue;
    if (!assetId) continue;
    const key = `${kind}:${assetId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    assets.push({ kind, assetId });
  }
  return assets;
}

export type SubmitDisposalBatchResult = {
  noRujukanPelupusan: string;
  submitted: number;
};

export type UploadDisposalImageInput = {
  mimeType: string;
  dataBase64: string;
  year: string;
  batch: string;
  slot: 'whole' | 'serial';
  assetId: string;
};

export type UploadDisposalImageResult = {
  url: string;
  path: string;
};

export type DisposalUploadBatch = {
  year: string;
  batch: string;
  path: string;
};

export type DisposalHistoryAsset = {
  disposalId: number;
  kind: AssetKind;
  assetId: AssetId;
  assetIdOld: string | null;
  brand: string | null;
  model: string | null;
  serialNum: string | null;
};

export type DisposalHistoryBatch = {
  noRujukanPelupusan: string;
  submittedAt: string | null;
  disposalDate: string | null;
  submittedBy: string | null;
  pusat: string;
  remarks: string | null;
  assetCount: number;
  assets: DisposalHistoryAsset[];
};

export type DisposalReportRepair = {
  repairDate: string | null;
  issueSummary: string | null;
};

export type DisposalReportAsset = {
  kind: AssetKind;
  assetId: AssetId;
  assetIdOld: string | null;
  nama: string;
  supplier: string | null;
  brand: string | null;
  model: string | null;
  serialNum: string | null;
  accCode: string | null;
  tarikhPenerimaan: string | null;
  purchaseCost: number | null;
  qty: 1;
  imageWholeAsset: string | null;
  imageSerialNumber: string | null;
  latarBelakang: string | null;
  rekodFizikalHarta: string | null;
  repairs: DisposalReportRepair[];
};

export type DisposalReport = {
  noRujukanPelupusan: string;
  pusat: string;
  disposalDate: string | null;
  disposalTime: string | null;
  submittedAt: string | null;
  lampiran1: DisposalReportAsset[];
  lampiran2: DisposalReportAsset[];
  borangTp10: DisposalReportAsset[];
};

export function isPredisposalReason(value: string): value is PredisposalReason {
  return (PREDISPOSAL_REASONS as readonly string[]).includes(value);
}

export function isLifespanOverYears(
  poDate: string | null | undefined,
  doDate: string | null | undefined,
  years = LIFESPAN_PREDISPOSAL_YEARS,
): boolean {
  const iso = poDate?.trim() || doDate?.trim() || '';
  if (!iso) return false;
  const start = new Date(iso);
  if (Number.isNaN(start.getTime())) return false;
  const cutoff = new Date(start.getFullYear() + years, start.getMonth(), start.getDate());
  const today = new Date();
  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return end.getTime() >= cutoff.getTime();
}

export function resolvePredisposalReason(input: {
  fallback: PredisposalReason;
  poDate?: string | null;
  doDate?: string | null;
}): PredisposalReason {
  if (input.fallback === 'return_from_deployment') return 'return_from_deployment';
  if (isLifespanOverYears(input.poDate, input.doDate)) return 'lifespan_over_7y';
  return input.fallback;
}

export function malaysiaTodayIso(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kuala_Lumpur' }).format(new Date());
}

export function malaysiaNowTime(): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kuala_Lumpur',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date());
  const hour = parts.find((p) => p.type === 'hour')?.value ?? '00';
  const minute = parts.find((p) => p.type === 'minute')?.value ?? '00';
  return `${hour}:${minute}`;
}
