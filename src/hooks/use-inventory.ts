import { useState, useEffect, useCallback } from 'react';
import type { ItemStatus } from '@/lib/constants';

export interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  description: string | null;
  category: string | null;
  location: string | null;
  supplier: string | null;
  quantity: number;
  low_stock_threshold: number;
  unit_price: number;
  image_url: string | null;
  status: ItemStatus;
  created_by: string;
  created_at: string;
  updated_at: string;
}

interface UseInventoryOptions {
  statusFilter?: ItemStatus | null;
  categoryFilter?: string | null;
  searchQuery?: string;
  sortBy?: 'name' | 'quantity' | 'date';
}

export function useInventory(options: UseInventoryOptions = {}) {
  const { statusFilter, categoryFilter, searchQuery, sortBy = 'name' } = options;
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchItems = useCallback(async () => {
    // Mock data - replace with your own data source
    const mockItems: InventoryItem[] = [];

    let filtered = mockItems;

    if (statusFilter) {
      filtered = filtered.filter(item => item.status === statusFilter);
    }
    if (categoryFilter) {
      filtered = filtered.filter(item => item.category === categoryFilter);
    }
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(query) ||
        item.sku.toLowerCase().includes(query) ||
        (item.description?.toLowerCase().includes(query) ?? false)
      );
    }

    const sorted = [...filtered].sort((a, b) => {
      if (sortBy === 'quantity') return a.quantity - b.quantity;
      if (sortBy === 'date') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      return a.name.localeCompare(b.name);
    });

    setItems(sorted as InventoryItem[]);
    setIsLoading(false);
  }, [statusFilter, categoryFilter, searchQuery, sortBy]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  return { items, isLoading, refetch: fetchItems };
}
