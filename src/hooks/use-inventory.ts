import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
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
    let query = supabase.from('inventory_items').select('*');
    if (statusFilter) query = query.eq('status', statusFilter);
    if (categoryFilter) query = query.eq('category', categoryFilter);
    if (searchQuery) {
      query = query.or(`name.ilike.%${searchQuery}%,sku.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`);
    }

    const { data, error } = await query;
    if (error || !data) {
      setIsLoading(false);
      return;
    }

    const sorted = [...data].sort((a, b) => {
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

  useEffect(() => {
    const channel = supabase
      .channel('inventory-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory_items' }, () => {
        fetchItems();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchItems]);

  return { items, isLoading, refetch: fetchItems };
}
