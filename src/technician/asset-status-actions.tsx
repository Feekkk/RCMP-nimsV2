import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { AssetKind } from '@/lib/inventory-schema';
import { formatStatusLabel } from '@/lib/inventory-schema';
import { getAssetStatusActions } from '@/lib/asset-status-actions';

type AssetStatusActionsProps = {
  kind: AssetKind;
  assetId: number;
  statusId: number;
  onStatusChange: (assetId: number, newStatusId: number) => Promise<void>;
  disabled?: boolean;
};

export function AssetStatusActions({
  kind,
  assetId,
  statusId,
  onStatusChange,
  disabled,
}: AssetStatusActionsProps) {
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const actions = getAssetStatusActions(kind, statusId);

  if (actions.length === 0) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }

  const handleAction = async (actionKey: string, targetStatusId: number, label: string) => {
    setPendingKey(actionKey);
    try {
      await onStatusChange(assetId, targetStatusId);
      toast.success(`${label} — now ${formatStatusLabel(targetStatusId)}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Status update failed');
    } finally {
      setPendingKey(null);
    }
  };

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex flex-wrap items-center gap-1">
        {actions.map((action) => {
          const Icon = action.icon;
          const isPending = pendingKey === action.key;
          return (
            <Tooltip key={action.key}>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  className={`h-8 w-8 shrink-0 rounded-[8px] ${action.buttonClassName}`}
                  disabled={disabled || pendingKey !== null}
                  aria-label={action.label}
                  onClick={() => void handleAction(action.key, action.targetStatusId, action.label)}
                >
                  {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">{action.label}</TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
