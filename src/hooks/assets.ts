import { useCallback, useEffect, useState } from 'react';
import {
  ASSET_KIND_LABEL,
  ASSET_LIST_PATH,
  formatStatusLabel,
  isActiveStatus,
  type AssetKind,
  type AvAsset,
  type CreateAvInput,
  type CreateLaptopInput,
  type CreateNetworkInput,
  type LaptopAsset,
  type NetworkAsset,
} from '@/lib/inventory-schema';
import {
  bulkCreateAvFn,
  bulkCreateLaptopsFn,
  bulkCreateNetworkFn,
  createAvFn,
  createLaptopFn,
  createNetworkFn,
  listAssetsFn,
} from '@/server/assets.functions';

export type {
  AssetKind,
  AvAsset,
  CreateAvInput,
  CreateLaptopInput,
  CreateNetworkInput,
  LaptopAsset,
  NetworkAsset,
};
export { ASSET_KIND_LABEL, ASSET_LIST_PATH, formatStatusLabel, isActiveStatus };

type AssetByKind = {
  laptop: LaptopAsset[];
  av: AvAsset[];
  network: NetworkAsset[];
};

export function useAssets<K extends AssetKind>(kind: K) {
  const [items, setItems] = useState<AssetByKind[K]>([] as AssetByKind[K]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await listAssetsFn({ data: kind });
      setItems(data as AssetByKind[K]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load assets');
      setItems([] as AssetByKind[K]);
    } finally {
      setIsLoading(false);
    }
  }, [kind]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  const create = useCallback(
    async (input: K extends 'laptop' ? CreateLaptopInput : K extends 'av' ? CreateAvInput : CreateNetworkInput) => {
      if (kind === 'laptop') {
        const created = await createLaptopFn({ data: input as CreateLaptopInput });
        await refetch();
        return created;
      }
      if (kind === 'av') {
        const created = await createAvFn({ data: input as CreateAvInput });
        await refetch();
        return created;
      }
      const created = await createNetworkFn({ data: input as CreateNetworkInput });
      await refetch();
      return created;
    },
    [kind, refetch],
  );

  const bulkCreate = useCallback(
    async (rows: K extends 'laptop' ? CreateLaptopInput[] : K extends 'av' ? CreateAvInput[] : CreateNetworkInput[]) => {
      let count = 0;
      if (kind === 'laptop') {
        count = await bulkCreateLaptopsFn({ data: rows as CreateLaptopInput[] });
      } else if (kind === 'av') {
        count = await bulkCreateAvFn({ data: rows as CreateAvInput[] });
      } else {
        count = await bulkCreateNetworkFn({ data: rows as CreateNetworkInput[] });
      }
      await refetch();
      return count;
    },
    [kind, refetch],
  );

  return { items, create, bulkCreate, isLoading, error, refetch };
}

export function filterBySearch<
  T extends { model: string | null; assetId: number; serialNum?: string | null; brand?: string | null; remarks?: string | null },
>(items: T[], query: string, extra?: (item: T) => string): T[] {
  const q = query.trim().toLowerCase();
  if (!q) return items;
  return items.filter((item) => {
    const haystack = [
      item.model,
      String(item.assetId),
      item.serialNum,
      item.brand,
      item.remarks,
      extra?.(item) ?? '',
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return haystack.includes(q);
  });
}

export function countActiveAssets<T extends { statusId: number }>(items: T[]) {
  return {
    active: items.filter((i) => isActiveStatus(i.statusId)).length,
    other: items.filter((i) => !isActiveStatus(i.statusId)).length,
  };
}
