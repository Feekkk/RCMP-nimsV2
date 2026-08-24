import { useEffect, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { AssetKind } from '@shared/lib/inventory-schema';
import { formatStatusLabel } from '@shared/lib/inventory-schema';
import {
  getAssetStatusActions,
  getRepairOrWarrantyAction,
  isFaultyServiceStatus,
  type AssetStatusAction,
} from '@shared/lib/asset-status-actions';
import { getWarrantyContextFn } from '@backend/server/requests/warranty-repair.functions';

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
  const [warrantyActive, setWarrantyActive] = useState<boolean | null>(null);
  const lifecycle = getAssetStatusActions(kind, statusId);
  const needsFaultyService = isFaultyServiceStatus(statusId);

  useEffect(() => {
    if (!needsFaultyService) {
      setWarrantyActive(null);
      return;
    }
    let cancelled = false;
    setWarrantyActive(null);
    void getWarrantyContextFn({ data: { kind, assetId } })
      .then((ctx) => {
        if (!cancelled) setWarrantyActive(ctx.isActive);
      })
      .catch(() => {
        if (!cancelled) setWarrantyActive(false);
      });
    return () => {
      cancelled = true;
    };
  }, [needsFaultyService, kind, assetId]);

  const actions: AssetStatusAction[] = [
    ...lifecycle,
    ...(needsFaultyService && warrantyActive !== null
      ? [getRepairOrWarrantyAction(warrantyActive)]
      : []),
  ];

  if (actions.length === 0 && !(needsFaultyService && warrantyActive === null)) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }

  const handleStatusAction = async (actionKey: string, targetStatusId: number, label: string) => {
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
          const btnClass = `h-8 w-8 shrink-0 rounded-[8px] ${action.buttonClassName}`;

          if (action.mode === 'navigate') {
            return (
              <Tooltip key={action.key}>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    className={btnClass}
                    disabled={disabled}
                    aria-label={action.label}
                    asChild
                  >
                    <Link to={action.href} search={{ kind, assetId }}>
                      <Icon className="h-4 w-4" />
                    </Link>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">{action.label}</TooltipContent>
              </Tooltip>
            );
          }

          return (
            <Tooltip key={action.key}>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  className={btnClass}
                  disabled={disabled || pendingKey !== null}
                  aria-label={action.label}
                  onClick={() =>
                    void handleStatusAction(action.key, action.targetStatusId, action.label)
                  }
                >
                  {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">{action.label}</TooltipContent>
            </Tooltip>
          );
        })}
        {needsFaultyService && warrantyActive === null ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-label="Checking warranty" />
        ) : null}
      </div>
    </TooltipProvider>
  );
}
