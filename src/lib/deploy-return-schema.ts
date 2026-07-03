import type { AssetKind } from '@/lib/inventory-schema';
import { STATUS_ID } from '@/lib/asset-status-actions';

export type DeployReturnSearch = {
  kind: AssetKind;
  assetId: number;
};

export const RETURN_CONDITIONS = ['Good', 'Bad'] as const;

export const CAMPUS_BUILDINGS = ['Al Razi', 'Avicenna', 'Al Zahrawi'] as const;

export type CampusBuilding = (typeof CAMPUS_BUILDINGS)[number];

export type ReturnCondition = (typeof RETURN_CONDITIONS)[number];

export type StaffRecipient = {
  employeeNo: string;
  fullName: string;
  department: string | null;
  email: string | null;
  phone: string | null;
};

export type LaptopHandoverOpen = {
  type: 'staff';
  handoverId: number;
  handoverStaffId: number;
  handoverDate: string;
  handoverRemarks: string | null;
  employeeNo: string;
  recipientName: string;
  department: string | null;
  handledBy: string | null;
};

export type LaptopPlaceOpen = {
  type: 'place';
  handoverId: number;
  handoverDate: string;
  handoverRemarks: string | null;
  handledBy: string | null;
};

export type PlaceDeploymentOpen = {
  deploymentId: number;
  building: string;
  level: string;
  zone: string;
  deploymentDate: string;
  deploymentRemarks: string | null;
  handledBy: string | null;
};

export type OpenReturnContext =
  | { kind: 'laptop'; record: LaptopHandoverOpen | LaptopPlaceOpen }
  | { kind: 'av'; record: PlaceDeploymentOpen }
  | { kind: 'network'; record: PlaceDeploymentOpen };

export type DeployLaptopStaffInput = {
  assetId: number;
  staffId: string;
  employeeNo: string;
  handoverDate: string;
  handoverRemarks?: string | null;
};

export type DeployLaptopPlaceInput = {
  assetId: number;
  staffId: string;
  handoverDate: string;
  handoverRemarks?: string | null;
};

export type DeployPlaceInput = {
  kind: 'av' | 'network';
  assetId: number;
  staffId: string;
  building: string;
  level: string;
  zone: string;
  deploymentDate: string;
  deploymentRemarks?: string | null;
};

export type ReturnLaptopStaffInput = {
  handoverStaffId: number;
  returnedBy: string;
  returnDate: string;
  returnTime?: string | null;
  returnPlace?: string | null;
  condition?: string | null;
  returnRemarks?: string | null;
};

export type ReturnLaptopPlaceInput = {
  handoverId: number;
  returnedBy: string;
  returnDate: string;
  returnTime?: string | null;
  returnPlace?: string | null;
  condition?: string | null;
  returnRemarks?: string | null;
};

export type ReturnPlaceInput = {
  kind: 'av' | 'network';
  deploymentId: number;
  returnedBy: string;
  returnDate: string;
  returnTime?: string | null;
  returnPlace?: string | null;
  condition?: string | null;
  returnRemarks?: string | null;
};

export function getReturnTargetStatusId(
  _kind: AssetKind,
  condition?: string | null,
): number {
  return getReturnStatusIdForCondition(condition);
}

export function getReturnStatusIdForCondition(condition?: string | null): number {
  if (condition?.trim().toLowerCase() === 'bad') return STATUS_ID.DISPOSED;
  return STATUS_ID.RETURN;
}

export function getDeployTargetStatusId(): number {
  return STATUS_ID.DEPLOY;
}
