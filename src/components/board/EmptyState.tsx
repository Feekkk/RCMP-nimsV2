import { Lightbulb } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EmptyStateProps {
  hasFilters: boolean;
  onClearFilters: () => void;
  onSubmit: () => void;
}

export function EmptyState({ hasFilters, onClearFilters, onSubmit }: EmptyStateProps) {
  if (hasFilters) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-sm text-muted-foreground">No ideas match your filters</p>
        <Button variant="outline" size="sm" className="mt-3" onClick={onClearFilters}>
          Clear filters
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 mb-4">
        <Lightbulb className="h-6 w-6 text-primary" />
      </div>
      <h3 className="text-base font-semibold text-foreground">No ideas yet</h3>
      <p className="mt-1 text-sm text-muted-foreground">Be the first to submit a feature idea!</p>
      <Button size="sm" className="mt-4" onClick={onSubmit}>
        Submit idea
      </Button>
    </div>
  );
}
