import type { LucideIcon } from 'lucide-react';
import { Hammer, Reply, Shield, Truck } from 'lucide-react';
import type { AssetKind, StatusId } from '@/lib/inventory-schema';

/** status_id values from database/schema.sql */
export const STATUS_ID = {
  NEW: 1,
  RETURN: 2,
  DEPLOY: 3,
  PRE_DISPOSED: 4,
  DISPOSED: 5,
  REQUEST_ACTIVE: 6,
  REQUEST_BOOKED: 7,
  REQUEST_CHECKOUT: 8,
} as const;

export type AssetStatusNavigateHref =
  | '/technician/deploy'
  | '/technician/return'
  | '/technician/repair'
  | '/technician/warranty';

export type AssetStatusAction = {
  key: string;
  label: string;
  icon: LucideIcon;
  /** Tailwind classes for icon button (outline-style, semantic color). */
  buttonClassName: string;
  /** Direct status update without navigation. */
  mode: 'status';
  targetStatusId: StatusId;
} | {
  key: string;
  label: string;
  icon: LucideIcon;
  buttonClassName: string;
  /** Open deploy / return / repair / warranty form */
  mode: 'navigate';
  href: AssetStatusNavigateHref;
};

const actionBtn =
  'border shadow-sm hover:opacity-90 disabled:opacity-50';

const DEPLOY_ACTION: AssetStatusAction = {
  key: 'deploy',
  label: 'Deploy',
  mode: 'navigate',
  href: '/technician/deploy',
  icon: Truck,
  buttonClassName: `${actionBtn} border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100 dark:border-sky-800 dark:bg-sky-950 dark:text-sky-200 dark:hover:bg-sky-900`,
};

const RETURN_ACTION: AssetStatusAction = {
  key: 'return',
  label: 'Return',
  mode: 'navigate',
  href: '/technician/return',
  icon: Reply,
  buttonClassName: `${actionBtn} border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200 dark:hover:bg-amber-900`,
};

const REPAIR_ACTION: AssetStatusAction = {
  key: 'repair',
  label: 'In-house repair',
  mode: 'navigate',
  href: '/technician/repair',
  icon: Hammer,
  buttonClassName: `${actionBtn} border-orange-200 bg-orange-50 text-orange-800 hover:bg-orange-100 dark:border-orange-800 dark:bg-orange-950 dark:text-orange-200 dark:hover:bg-orange-900`,
};

const WARRANTY_ACTION: AssetStatusAction = {
  key: 'warranty',
  label: 'Warranty claim',
  mode: 'navigate',
  href: '/technician/warranty',
  icon: Shield,
  buttonClassName: `${actionBtn} border-violet-200 bg-violet-50 text-violet-800 hover:bg-violet-100 dark:border-violet-800 dark:bg-violet-950 dark:text-violet-200 dark:hover:bg-violet-900`,
};

const FAULTY_SERVICE_STATUSES = new Set<number>([
  STATUS_ID.RETURN,
  STATUS_ID.DEPLOY,
  STATUS_ID.REQUEST_ACTIVE,
]);

/** Unified asset lifecycle — see status.md (applies to laptop, av, network) */
const LIFECYCLE_ACTIONS: Partial<Record<StatusId, AssetStatusAction[]>> = {
  [STATUS_ID.NEW]: [DEPLOY_ACTION],
  [STATUS_ID.DEPLOY]: [RETURN_ACTION],
  [STATUS_ID.RETURN]: [DEPLOY_ACTION],
};

export function isFaultyServiceStatus(statusId: number): boolean {
  return FAULTY_SERVICE_STATUSES.has(statusId);
}

export function getRepairOrWarrantyAction(warrantyActive: boolean): AssetStatusAction {
  return warrantyActive ? WARRANTY_ACTION : REPAIR_ACTION;
}

export function getAssetStatusActions(_kind: AssetKind, statusId: number): AssetStatusAction[] {
  return LIFECYCLE_ACTIONS[statusId as StatusId] ?? [];
}

export function isAllowedStatusTransition(
  kind: AssetKind,
  fromStatusId: number,
  toStatusId: number,
): boolean {
  return getAssetStatusActions(kind, fromStatusId).some(
    (a) => a.mode === 'status' && a.targetStatusId === toStatusId,
  );
}
