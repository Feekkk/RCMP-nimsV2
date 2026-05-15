import { useState } from 'react';
import { STATUS_OPTIONS } from '@/lib/constants';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { StatusBadge } from './StatusBadge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface StatusUpdateDropdownProps {
  requestId: string;
  currentStatus: string;
}

export function StatusUpdateDropdown({ requestId, currentStatus }: StatusUpdateDropdownProps) {
  const [updating, setUpdating] = useState(false);

  const handleStatusChange = async (newStatus: string) => {
    if (newStatus === currentStatus) return;
    setUpdating(true);
    const { error } = await supabase
      .from('feature_requests')
      .update({ status: newStatus })
      .eq('id', requestId);
    setUpdating(false);

    if (error) {
      toast.error('Failed to update status');
    } else {
      toast.success(`Status updated to "${newStatus}"`);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild disabled={updating}>
        <button className="cursor-pointer">
          <StatusBadge status={currentStatus} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {STATUS_OPTIONS.map(status => (
          <DropdownMenuItem
            key={status}
            onClick={() => handleStatusChange(status)}
            className={status === currentStatus ? 'font-semibold' : ''}
          >
            <StatusBadge status={status} />
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
