import type { LucideIcon } from 'lucide-react';
import { ClipboardCheck, Reply, Trash2, Truck } from 'lucide-react';
import type { AssetKind, StatusId } from '@/lib/inventory-schema';

/** status_id values from database/schema.sql */
export const STATUS_ID = {
  NEW: 1,
  RETURN: 2,
  DEPLOY: 3,
  ASSIGN: 4,
  DISPOSED: 5,
  REQUEST_ACTIVE: 6,
  REQUEST_BOOKED: 7,
  REQUEST_CHECKOUT: 8,
} as const;

export type AssetStatusAction = {
  key: string;
  label: string;
  icon: LucideIcon;
  /** Tailwind classes for icon button (outline-style, semantic color). */
  buttonClassName: string;
  /** Direct status update (assign). */
  mode: 'status';
  targetStatusId: StatusId;
} | {
  key: string;
  label: string;
  icon: LucideIcon;
  buttonClassName: string;
  /** Open deploy / return / disposal form */
  mode: 'navigate';
  href:
    | '/technician/deploy'
    | '/technician/return'
    | '/technician/disposal';
};

const actionBtn =
  'border shadow-sm hover:opacity-90 disabled:opacity-50';

const ASSIGN_ACTION: AssetStatusAction = {
  key: 'assign',
  label: 'Assign',
  mode: 'status',
  targetStatusId: STATUS_ID.ASSIGN,
  icon: ClipboardCheck,
  buttonClassName: `${actionBtn} border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:border-indigo-800 dark:bg-indigo-950 dark:text-indigo-200 dark:hover:bg-indigo-900`,
};

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

const DISPOSE_ACTION: AssetStatusAction = {
  key: 'dispose',
  label: 'Dispose',
  mode: 'navigate',
  href: '/technician/disposal',
  icon: Trash2,
  buttonClassName: `${actionBtn} border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-200 dark:hover:bg-rose-900`,
};

/** Unified asset lifecycle — see status.md (applies to laptop, av, network) */
const LIFECYCLE_ACTIONS: Partial<Record<StatusId, AssetStatusAction[]>> = {
  [STATUS_ID.NEW]: [ASSIGN_ACTION, DEPLOY_ACTION],
  [STATUS_ID.ASSIGN]: [DEPLOY_ACTION],
  [STATUS_ID.DEPLOY]: [RETURN_ACTION],
  [STATUS_ID.RETURN]: [ASSIGN_ACTION, DISPOSE_ACTION],
};

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
