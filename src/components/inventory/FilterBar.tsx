import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CATEGORY_OPTIONS, STATUS_CONFIG, type ItemStatus } from '@/lib/constants';

interface FilterBarProps {
  statusFilter: ItemStatus | null;
  onStatusChange: (s: ItemStatus | null) => void;
  categoryFilter: string | null;
  onCategoryChange: (c: string | null) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  sortBy: 'name' | 'quantity' | 'date';
  onSortChange: (s: 'name' | 'quantity' | 'date') => void;
}

export function FilterBar(props: FilterBarProps) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by name, SKU, description..."
          value={props.searchQuery}
          onChange={(e) => props.onSearchChange(e.target.value)}
          className="h-10 rounded-[8px] pl-9"
        />
      </div>

      <Select
        value={props.statusFilter ?? 'all'}
        onValueChange={(v) => props.onStatusChange(v === 'all' ? null : (v as ItemStatus))}
      >
        <SelectTrigger className="h-10 w-full sm:w-[140px] rounded-[8px]">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          {(Object.keys(STATUS_CONFIG) as ItemStatus[]).map((s) => (
            <SelectItem key={s} value={s}>{STATUS_CONFIG[s].label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={props.categoryFilter ?? 'all'}
        onValueChange={(v) => props.onCategoryChange(v === 'all' ? null : v)}
      >
        <SelectTrigger className="h-10 w-full sm:w-[160px] rounded-[8px]">
          <SelectValue placeholder="Category" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All categories</SelectItem>
          {CATEGORY_OPTIONS.map((c) => (
            <SelectItem key={c} value={c}>{c}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={props.sortBy} onValueChange={(v) => props.onSortChange(v as 'name' | 'quantity' | 'date')}>
        <SelectTrigger className="h-10 w-full sm:w-[140px] rounded-[8px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="name">Sort: Name</SelectItem>
          <SelectItem value="quantity">Sort: Quantity</SelectItem>
          <SelectItem value="date">Sort: Newest</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
