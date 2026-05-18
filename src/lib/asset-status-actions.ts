import type { LucideIcon } from 'lucide-react';
import {
  AlertCircle,
  Archive,
  Hammer,
  PackageCheck,
  PackageX,
  Power,
  Reply,
  Signal,
  SignalZero,
  Truck,
} from 'lucide-react';
import type { AssetKind, StatusId } from '@/lib/inventory-schema';

/** status_id values from database/schema.sql */
export const STATUS_ID = {
  ACTIVE: 1,
  NON_ACTIVE: 2,
  DEPLOY: 3,
  FAULTY: 4,
  DISPOSED: 5,
  LOST: 6,
  ONLINE: 7,
  OFFLINE: 8,
} as const;

export type AssetStatusAction = {
  key: string;
  label: string;
  targetStatusId: StatusId;
  icon: LucideIcon;
  /** Tailwind classes for icon button (outline-style, semantic color). */
  buttonClassName: string;
};

const actionBtn =
  'border shadow-sm hover:opacity-90 disabled:opacity-50';

/** Laptop & AV — assetid-flow.md */
const LAPTOP_AV_ACTIONS: Partial<Record<StatusId, AssetStatusAction[]>> = {
  [STATUS_ID.ACTIVE]: [
    {
      key: 'deploy',
      label: 'Deploy',
      targetStatusId: STATUS_ID.DEPLOY,
      icon: Truck,
      buttonClassName: `${actionBtn} border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100 dark:border-sky-800 dark:bg-sky-950 dark:text-sky-200 dark:hover:bg-sky-900`,
    },
    {
      key: 'faulty',
      label: 'Mark faulty',
      targetStatusId: STATUS_ID.FAULTY,
      icon: AlertCircle,
      buttonClassName: `${actionBtn} border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200 dark:hover:bg-amber-900`,
    },
    {
      key: 'lost',
      label: 'Mark lost',
      targetStatusId: STATUS_ID.LOST,
      icon: PackageX,
      buttonClassName: `${actionBtn} border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-200 dark:hover:bg-rose-900`,
    },
    {
      key: 'non-active',
      label: 'Set non-active',
      targetStatusId: STATUS_ID.NON_ACTIVE,
      icon: Archive,
      buttonClassName: `${actionBtn} border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800`,
    },
  ],
  [STATUS_ID.NON_ACTIVE]: [
    {
      key: 'active',
      label: 'Activate',
      targetStatusId: STATUS_ID.ACTIVE,
      icon: Power,
      buttonClassName: `${actionBtn} border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200 dark:hover:bg-emerald-900`,
    },
  ],
  [STATUS_ID.DEPLOY]: [
    {
      key: 'return',
      label: 'Return',
      targetStatusId: STATUS_ID.ACTIVE,
      icon: Reply,
      buttonClassName: `${actionBtn} border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200 dark:hover:bg-emerald-900`,
    },
  ],
  [STATUS_ID.FAULTY]: [
    {
      key: 'repair',
      label: 'Repair complete',
      targetStatusId: STATUS_ID.ACTIVE,
      icon: Hammer,
      buttonClassName: `${actionBtn} border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100 dark:border-violet-800 dark:bg-violet-950 dark:text-violet-200 dark:hover:bg-violet-900`,
    },
  ],
};

/** Network — assetid-flow.md */
const NETWORK_ACTIONS: Partial<Record<StatusId, AssetStatusAction[]>> = {
  [STATUS_ID.ONLINE]: [
    {
      key: 'deploy',
      label: 'Deploy',
      targetStatusId: STATUS_ID.DEPLOY,
      icon: Truck,
      buttonClassName: `${actionBtn} border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100 dark:border-sky-800 dark:bg-sky-950 dark:text-sky-200 dark:hover:bg-sky-900`,
    },
    {
      key: 'faulty',
      label: 'Mark faulty',
      targetStatusId: STATUS_ID.FAULTY,
      icon: AlertCircle,
      buttonClassName: `${actionBtn} border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200 dark:hover:bg-amber-900`,
    },
    {
      key: 'lost',
      label: 'Mark lost',
      targetStatusId: STATUS_ID.LOST,
      icon: PackageX,
      buttonClassName: `${actionBtn} border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-200 dark:hover:bg-rose-900`,
    },
    {
      key: 'offline',
      label: 'Set offline',
      targetStatusId: STATUS_ID.OFFLINE,
      icon: SignalZero,
      buttonClassName: `${actionBtn} border-yellow-200 bg-yellow-50 text-yellow-800 hover:bg-yellow-100 dark:border-yellow-800 dark:bg-yellow-950 dark:text-yellow-200 dark:hover:bg-yellow-900`,
    },
  ],
  [STATUS_ID.OFFLINE]: [
    {
      key: 'online',
      label: 'Set online',
      targetStatusId: STATUS_ID.ONLINE,
      icon: Signal,
      buttonClassName: `${actionBtn} border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200 dark:hover:bg-emerald-900`,
    },
  ],
  [STATUS_ID.DEPLOY]: [
    {
      key: 'return',
      label: 'Return',
      targetStatusId: STATUS_ID.ONLINE,
      icon: PackageCheck,
      buttonClassName: `${actionBtn} border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200 dark:hover:bg-emerald-900`,
    },
  ],
  [STATUS_ID.FAULTY]: [
    {
      key: 'repair',
      label: 'Repair complete',
      targetStatusId: STATUS_ID.ONLINE,
      icon: Hammer,
      buttonClassName: `${actionBtn} border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100 dark:border-violet-800 dark:bg-violet-950 dark:text-violet-200 dark:hover:bg-violet-900`,
    },
  ],
};

export function getAssetStatusActions(kind: AssetKind, statusId: number): AssetStatusAction[] {
  const map = kind === 'network' ? NETWORK_ACTIONS : LAPTOP_AV_ACTIONS;
  return map[statusId as StatusId] ?? [];
}

export function isAllowedStatusTransition(
  kind: AssetKind,
  fromStatusId: number,
  toStatusId: number,
): boolean {
  return getAssetStatusActions(kind, fromStatusId).some((a) => a.targetStatusId === toStatusId);
}
