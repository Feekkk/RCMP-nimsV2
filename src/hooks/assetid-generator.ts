/**
 * Asset ID format: PP + YY + SSS (no separators in storage; e.g. 1225001 = 12-25-001).
 * See assetid-flow.md for when each prefix applies.
 */
import { useCallback, useEffect, useState } from 'react';
import type { AssetKind } from '@/lib/inventory-schema';
import { getNextAssetIdFn } from '@/server/assets.functions';

export const ASSET_ID_PREFIX = {
  laptop: 12,
  desktop: 14,
  network: 24,
  av: 88,
} as const;

/** Categories that use prefix 12 (Notebook). Matched case-insensitively. */
export const LAPTOP_NOTEBOOK_CATEGORIES = ['Notebook', 'Notebook standby'] as const;

/** Categories that use prefix 14 (Desktop). Matched case-insensitively. */
export const LAPTOP_DESKTOP_CATEGORIES = ['Desktop AIO', 'Desktop IO sharing'] as const;

export const ASSET_ID_SEQUENCE_MIN = 1;
export const ASSET_ID_SEQUENCE_MAX = 999;

export type AssetIdParts = {
  prefix: number;
  year: number;
  sequence: number;
};

export function normalizeCategory(category: string): string {
  return category.trim().toLowerCase().replace(/\s+/g, ' ');
}

function categoryInList(list: readonly string[], normalizedKey: string): boolean {
  return list.some((c) => normalizeCategory(c) === normalizedKey);
}

export function isNotebookCategory(category: string | null | undefined): boolean {
  if (!category?.trim()) return false;
  return categoryInList(LAPTOP_NOTEBOOK_CATEGORIES, normalizeCategory(category));
}

export function isDesktopCategory(category: string | null | undefined): boolean {
  if (!category?.trim()) return false;
  return categoryInList(LAPTOP_DESKTOP_CATEGORIES, normalizeCategory(category));
}

export function getLaptopAssetIdPrefix(category: string): typeof ASSET_ID_PREFIX.laptop | typeof ASSET_ID_PREFIX.desktop {
  const key = normalizeCategory(category);
  if (categoryInList(LAPTOP_DESKTOP_CATEGORIES, key)) {
    return ASSET_ID_PREFIX.desktop;
  }
  if (categoryInList(LAPTOP_NOTEBOOK_CATEGORIES, key)) {
    return ASSET_ID_PREFIX.laptop;
  }
  throw new Error(
    `Unknown laptop category "${category}". Use: Notebook, Notebook standby, Desktop AIO, or Desktop IO sharing.`,
  );
}

export function getAssetIdYearDigits(date: Date = new Date()): number {
  return date.getFullYear() % 100;
}

export function formatAssetId(prefix: number, yearDigits: number, sequence: number): number {
  if (sequence < ASSET_ID_SEQUENCE_MIN || sequence > ASSET_ID_SEQUENCE_MAX) {
    throw new Error(`Sequence must be ${ASSET_ID_SEQUENCE_MIN}–${ASSET_ID_SEQUENCE_MAX}`);
  }
  if (yearDigits < 0 || yearDigits > 99) {
    throw new Error('Year must be two digits (00–99)');
  }
  return prefix * 100_000 + yearDigits * 1_000 + sequence;
}

export function parseAssetId(assetId: number): AssetIdParts {
  const prefix = Math.floor(assetId / 100_000);
  const year = Math.floor((assetId % 100_000) / 1_000);
  const sequence = assetId % 1_000;
  return { prefix, year, sequence };
}

export function getAssetIdRange(prefix: number, yearDigits: number): { min: number; max: number } {
  return {
    min: formatAssetId(prefix, yearDigits, ASSET_ID_SEQUENCE_MIN),
    max: formatAssetId(prefix, yearDigits, ASSET_ID_SEQUENCE_MAX),
  };
}

/** Human-readable label (dashes for display only). */
export function formatAssetIdDisplay(assetId: number): string {
  const { prefix, year, sequence } = parseAssetId(assetId);
  return `${prefix}-${String(year).padStart(2, '0')}-${String(sequence).padStart(3, '0')}`;
}

export function getPrefixForKind(
  kind: AssetKind,
  options?: { category?: string },
): number {
  switch (kind) {
    case 'laptop':
      if (!options?.category?.trim()) {
        throw new Error('Laptop asset ID requires a category to choose prefix 12 or 14');
      }
      return getLaptopAssetIdPrefix(options.category);
    case 'network':
      return ASSET_ID_PREFIX.network;
    case 'av':
      return ASSET_ID_PREFIX.av;
  }
}

/** Next sequence after maxId in range, or 1 if none. */
export function nextSequenceAfter(maxId: number | null, prefix: number, yearDigits: number): number {
  const { min } = getAssetIdRange(prefix, yearDigits);
  if (maxId == null || maxId < min) {
    return ASSET_ID_SEQUENCE_MIN;
  }
  const { sequence } = parseAssetId(maxId);
  const next = sequence + 1;
  if (next > ASSET_ID_SEQUENCE_MAX) {
    throw new Error(
      `No asset IDs left for prefix ${prefix} in year ${String(yearDigits).padStart(2, '0')} (max ${ASSET_ID_SEQUENCE_MAX} per year)`,
    );
  }
  return next;
}

export function buildNextAssetId(maxId: number | null, prefix: number, yearDigits: number): number {
  const sequence = nextSequenceAfter(maxId, prefix, yearDigits);
  return formatAssetId(prefix, yearDigits, sequence);
}

/** Allocate count sequential IDs after maxId (same prefix/year). */
export function buildSequentialAssetIds(
  maxId: number | null,
  prefix: number,
  yearDigits: number,
  count: number,
): number[] {
  const ids: number[] = [];
  let currentMax = maxId;
  for (let i = 0; i < count; i++) {
    const id = buildNextAssetId(currentMax, prefix, yearDigits);
    ids.push(id);
    currentMax = id;
  }
  return ids;
}

export const LAPTOP_CATEGORY_OPTIONS = [
  ...LAPTOP_NOTEBOOK_CATEGORIES,
  ...LAPTOP_DESKTOP_CATEGORIES,
] as const;

/** Fetches the next asset_id from DB (single add-asset). Re-runs when kind or laptop category changes. */
export function useNextAssetId(kind: AssetKind, laptopCategory?: string) {
  const [assetId, setAssetId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const id = await getNextAssetIdFn({
        data: {
          kind,
          category: kind === 'laptop' ? laptopCategory : undefined,
        },
      });
      setAssetId(id);
      return id;
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to generate asset ID';
      setError(message);
      setAssetId(null);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [kind, laptopCategory]);

  useEffect(() => {
    if (kind === 'laptop' && !laptopCategory?.trim()) {
      setAssetId(null);
      setIsLoading(false);
      setError(null);
      return;
    }
    void refetch();
  }, [kind, laptopCategory, refetch]);

  return { assetId, isLoading, error, refetch };
}
