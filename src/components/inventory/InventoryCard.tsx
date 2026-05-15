import { MapPin, Tag, Truck, Pencil, Trash2 } from 'lucide-react';
import { StatusBadge } from './StatusBadge';
import type { InventoryItem } from '@/hooks/use-inventory';

interface Props {
  item: InventoryItem;
  isAdmin: boolean;
  onEdit: (item: InventoryItem) => void;
  onDelete: (item: InventoryItem) => void;
}

export function InventoryCard({ item, isAdmin, onEdit, onDelete }: Props) {
  return (
    <div className="group rounded-[16px] border border-border bg-card p-4 sm:p-5 transition-all hover:border-lavender/30 hover:shadow-md">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center overflow-hidden rounded-[12px] bg-secondary">
          {item.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.image_url} alt={item.name} className="h-full w-full object-cover" />
          ) : (
            <Tag className="h-6 w-6 text-muted-foreground" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="truncate text-base font-semibold text-foreground">{item.name}</h3>
                <StatusBadge status={item.status} />
              </div>
              <p className="mt-0.5 font-mono text-xs text-muted-foreground">SKU: {item.sku}</p>
            </div>

            <div className="text-right">
              <p className="text-lg font-bold tracking-tight text-foreground">{item.quantity}</p>
              <p className="text-[11px] text-muted-foreground">in stock</p>
            </div>
          </div>

          {item.description && (
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground line-clamp-2">{item.description}</p>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
            {item.category && (
              <span className="inline-flex items-center gap-1">
                <Tag className="h-3 w-3" />
                {item.category}
              </span>
            )}
            {item.location && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {item.location}
              </span>
            )}
            {item.supplier && (
              <span className="inline-flex items-center gap-1">
                <Truck className="h-3 w-3" />
                {item.supplier}
              </span>
            )}
            <span className="font-semibold text-foreground">
              ${Number(item.unit_price).toFixed(2)}
            </span>
          </div>

          {isAdmin && (
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => onEdit(item)}
                className="inline-flex items-center gap-1 rounded-[8px] px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                <Pencil className="h-3 w-3" /> Edit
              </button>
              <button
                onClick={() => onDelete(item)}
                className="inline-flex items-center gap-1 rounded-[8px] px-2 py-1 text-xs font-medium text-rose-600 hover:bg-rose-50"
              >
                <Trash2 className="h-3 w-3" /> Delete
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
