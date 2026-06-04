import { useEffect, useMemo, useState } from 'react';

export const ASSET_PAGE_SIZE_OPTIONS = [15, 25, 50] as const;
export const DEFAULT_ASSET_PAGE_SIZE = 25;

export function usePagination<T>(
  items: T[],
  options?: { pageSize?: number; resetKey?: string | number },
) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(options?.pageSize ?? DEFAULT_ASSET_PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [options?.resetKey]);

  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const safePage = Math.min(page, totalPages);
  const rangeStart = totalItems === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const rangeEnd = Math.min(safePage * pageSize, totalItems);

  const paginatedItems = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, safePage, pageSize]);

  return {
    page: safePage,
    setPage,
    pageSize,
    setPageSize,
    paginatedItems,
    totalPages,
    totalItems,
    rangeStart,
    rangeEnd,
  };
}
