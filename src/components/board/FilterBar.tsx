import { Search, X } from 'lucide-react';
import { STATUS_OPTIONS, CATEGORY_OPTIONS } from '@/lib/constants';

interface FilterBarProps {
  statusFilter: string | null;
  onStatusChange: (status: string | null) => void;
  categoryFilter: string | null;
  onCategoryChange: (category: string | null) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  sortBy: 'votes' | 'date';
  onSortChange: (sort: 'votes' | 'date') => void;
}

export function FilterBar({
  statusFilter, onStatusChange,
  categoryFilter, onCategoryChange,
  searchQuery, onSearchChange,
  sortBy, onSortChange,
}: FilterBarProps) {
  const hasFilters = statusFilter || categoryFilter || searchQuery;

  return (
    <div className="space-y-3">
      {/* Search and sort row */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search ideas..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="h-11 sm:h-9 w-full rounded-[8px] border border-input bg-card pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-lavender/30"
          />
        </div>
        <div className="flex items-center gap-0.5 rounded-[8px] border border-border bg-card p-0.5 self-start sm:self-auto">
          <button
            onClick={() => onSortChange('votes')}
            className={`rounded-[6px] px-3 py-2 sm:py-1.5 text-xs font-semibold transition-colors min-h-[44px] sm:min-h-0 ${
              sortBy === 'votes' ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Top voted
          </button>
          <button
            onClick={() => onSortChange('date')}
            className={`rounded-[6px] px-3 py-2 sm:py-1.5 text-xs font-semibold transition-colors min-h-[44px] sm:min-h-0 ${
              sortBy === 'date' ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Newest
          </button>
        </div>
      </div>

      {/* Filter chips */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap sm:overflow-visible scrollbar-hide">
          <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">Status:</span>
          {STATUS_OPTIONS.map(status => (
            <button
              key={status}
              onClick={() => onStatusChange(statusFilter === status ? null : status)}
              className={`rounded-[8px] px-2.5 py-1.5 sm:py-1 text-xs font-medium transition-colors whitespace-nowrap min-h-[36px] sm:min-h-0 ${
                statusFilter === status
                  ? 'bg-foreground text-background'
                  : 'bg-secondary text-secondary-foreground hover:bg-accent/30'
              }`}
            >
              {status}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-medium text-muted-foreground">Category:</span>
          <select
            value={categoryFilter ?? ''}
            onChange={(e) => onCategoryChange(e.target.value || null)}
            className="h-9 sm:h-7 rounded-[8px] border border-input bg-card px-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-lavender/30"
          >
            <option value="">All</option>
            {CATEGORY_OPTIONS.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          {hasFilters && (
            <button
              onClick={() => {
                onStatusChange(null);
                onCategoryChange(null);
                onSearchChange('');
              }}
              className="ml-auto flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors min-h-[44px] sm:min-h-0"
            >
              <X className="h-3 w-3" />
              Clear filters
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
