import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CATEGORY_OPTIONS, LOCATION_OPTIONS } from '@/lib/constants';
import { toast } from 'sonner';
import type { InventoryItem } from '@/hooks/use-inventory';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  item: InventoryItem | null;
}

const empty = {
  name: '',
  sku: '',
  description: '',
  category: '',
  location: '',
  supplier: '',
  quantity: 0,
  low_stock_threshold: 5,
  unit_price: 0,
  image_url: '',
};

export function ItemFormModal({ open, onOpenChange, userId, item }: Props) {
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (item) {
      setForm({
        name: item.name,
        sku: item.sku,
        description: item.description ?? '',
        category: item.category ?? '',
        location: item.location ?? '',
        supplier: item.supplier ?? '',
        quantity: item.quantity,
        low_stock_threshold: item.low_stock_threshold,
        unit_price: Number(item.unit_price),
        image_url: item.image_url ?? '',
      });
    } else {
      setForm(empty);
    }
  }, [item, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.sku.trim()) {
      toast.error('Name and SKU are required');
      return;
    }
    setSaving(true);

    const payload = {
      name: form.name.trim(),
      sku: form.sku.trim(),
      description: form.description.trim() || null,
      category: form.category || null,
      location: form.location || null,
      supplier: form.supplier.trim() || null,
      quantity: Number(form.quantity) || 0,
      low_stock_threshold: Number(form.low_stock_threshold) || 0,
      unit_price: Number(form.unit_price) || 0,
      image_url: form.image_url.trim() || null,
    };

    const { error } = item
      ? await supabase.from('inventory_items').update(payload).eq('id', item.id)
      : await supabase.from('inventory_items').insert({ ...payload, created_by: userId });

    setSaving(false);

    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(item ? 'Item updated' : 'Item added');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{item ? 'Edit item' : 'Add inventory item'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="name">Name *</Label>
              <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div>
              <Label htmlFor="sku">SKU *</Label>
              <Input id="sku" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} required />
            </div>
            <div>
              <Label htmlFor="supplier">Supplier</Label>
              <Input id="supplier" value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} />
            </div>
            <div>
              <Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {CATEGORY_OPTIONS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Location</Label>
              <Select value={form.location} onValueChange={(v) => setForm({ ...form, location: v })}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {LOCATION_OPTIONS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="quantity">Quantity</Label>
              <Input id="quantity" type="number" min="0" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })} />
            </div>
            <div>
              <Label htmlFor="threshold">Low-stock threshold</Label>
              <Input id="threshold" type="number" min="0" value={form.low_stock_threshold} onChange={(e) => setForm({ ...form, low_stock_threshold: Number(e.target.value) })} />
            </div>
            <div>
              <Label htmlFor="price">Unit price ($)</Label>
              <Input id="price" type="number" step="0.01" min="0" value={form.unit_price} onChange={(e) => setForm({ ...form, unit_price: Number(e.target.value) })} />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="image">Image URL</Label>
              <Input id="image" value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} placeholder="https://..." />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="desc">Description</Label>
              <Textarea id="desc" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving} className="bg-foreground text-background hover:opacity-90">
              {saving ? 'Saving...' : item ? 'Save changes' : 'Add item'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
