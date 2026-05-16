import { Link } from '@tanstack/react-router';
import { Filter, PlusSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { AssetKind } from '@/hooks/assets';

type RegisterAssetActionsProps = {
  kind: AssetKind;
};

export function RegisterAssetActions({ kind }: RegisterAssetActionsProps) {
  return (
    <div className="ml-3 flex shrink-0 items-center gap-2">
      <Button variant="outline" size="sm" type="button" disabled title="Coming soon">
        <Filter className="h-4 w-4" />
        <span className="hidden sm:inline">Filter asset</span>
      </Button>

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
