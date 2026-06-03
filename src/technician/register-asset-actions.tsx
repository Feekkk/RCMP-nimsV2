import { Link } from '@tanstack/react-router';
import { Filter, PlusSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { AssetKind } from '@/hooks/assets';
import { formatStatusLabel, INVENTORY_STATUSES } from '@/lib/inventory-schema';
import { cn } from '@/lib/utils';

type RegisterAssetActionsProps = {
  kind: AssetKind;
  statusFilter: number | null;
  onStatusFilterChange: (statusId: number | null) => void;
};

export function RegisterAssetActions({
  kind,
  statusFilter,
  onStatusFilterChange,
}: RegisterAssetActionsProps) {
  const filterActive = statusFilter != null;
  const radioValue = statusFilter == null ? 'all' : String(statusFilter);

  return (
    <div className="ml-3 flex shrink-0 items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant={filterActive ? 'secondary' : 'outline'}
            size="sm"
            type="button"
            className={cn(filterActive && 'border-primary/30')}
          >
            <Filter className="h-4 w-4" />
            <span className="hidden max-w-[10rem] truncate sm:inline">
              {filterActive ? formatStatusLabel(statusFilter) : 'Filter asset'}
            </span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="max-h-80 w-56 overflow-y-auto">
          <DropdownMenuLabel>Filter by status</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={radioValue}
            onValueChange={(value) => onStatusFilterChange(value === 'all' ? null : Number(value))}
          >
            <DropdownMenuRadioItem value="all">All statuses</DropdownMenuRadioItem>
            {INVENTORY_STATUSES.map((s) => (
              <DropdownMenuRadioItem key={s.statusId} value={String(s.statusId)}>
                {formatStatusLabel(s.statusId)}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" type="button">
            <PlusSquare className="h-4 w-4" />
            <span className="hidden sm:inline">Register asset</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <Link to="/technician/add-asset" search={{ kind }}>
              Single asset
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link to="/technician/bulk-import" search={{ kind }}>
              Import bulk
            </Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
