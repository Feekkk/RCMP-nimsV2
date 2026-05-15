import { PackageOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EmptyStateProps {
  hasFilters: boolean;
  isAdmin: boolean;
  onClearFilters: () => void;
  onAdd: () => void;
}

export function EmptyState({ hasFilters, isAdmin, onClearFilters, onAdd }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[16px] border border-dashed border-border bg-card py-16 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-[12px] bg-lavender/15">
        <PackageOpen className="h-6 w-6 text-[oklch(0.45_0.12_290)]" />
      </div>
      <h3 className="text-base font-semibold text-foreground">
        {hasFilters ? 'No items match your filters' : 'No inventory items yet'}
      </h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        {hasFilters
          ? 'Try adjusting filters or search to find what you need.'
          : isAdmin ? 'Add your first item to start tracking inventory.' : 'An admin needs to add items before they appear here.'}
      </p>
      <div className="mt-6">
        {hasFilters ? (
          <Button variant="outline" onClick={onClearFilters}>Clear filters</Button>
        ) : isAdmin ? (
          <Button onClick={onAdd} className="bg-foreground text-background hover:opacity-90">Add item</Button>
        ) : null}
      </div>
    </div>
  );
}
