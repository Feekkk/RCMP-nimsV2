import type { AssetKind } from '@shared/lib/inventory-schema';
import { STATUS_ID } from '@shared/lib/asset-status-actions';

export type DeployReturnSearch = {
  kind: AssetKind;
  assetId: number;
};

export const RETURN_CONDITIONS = ['Good', 'Bad'] as const;

export const CAMPUS_BUILDINGS = ['Al Razi', 'Avicenna', 'Al Zahrawi'] as const;

export type CampusBuilding = (typeof CAMPUS_BUILDINGS)[number];

const CAMPUS_BUILDING_BY_KEY = new Map(
  CAMPUS_BUILDINGS.map((building) => [building.toLowerCase(), building] as const),
);

export function canonicalizeCampusBuilding(value: string | null | undefined): string {
  const trimmed = value?.trim();
  if (!trimmed) return 'Unknown';
  return CAMPUS_BUILDING_BY_KEY.get(trimmed.toLowerCase()) ?? trimmed;
}

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
  building: string | null;
  level: string | null;
  zone: string | null;
  handler: string | null;
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
  handledByName: string;
};

export type DeployLaptopPlaceInput = {
  assetId: number;
  staffId: string;
  building: string;
  level?: string | null;
  zone?: string | null;
  handler: string;
  handoverDate: string;
  handoverRemarks?: string | null;
  handledByName: string;
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

export type UpdateLaptopStaffHandoverInput = {
  kind: 'laptop';
  type: 'staff';
  assetId: number;
  handoverId: number;
  handoverStaffId: number;
  employeeNo: string;
  handoverDate: string;
  handoverRemarks?: string | null;
};

export type UpdateLaptopPlaceHandoverInput = {
  kind: 'laptop';
  type: 'place';
  assetId: number;
  handoverId: number;
  building: string;
  level?: string | null;
  zone?: string | null;
  handler: string;
  handoverDate: string;
  handoverRemarks?: string | null;
};

export type UpdatePlaceDeploymentInput = {
  kind: 'av' | 'network';
  assetId: number;
  deploymentId: number;
  building: string;
  level: string;
  zone: string;
  deploymentDate: string;
  deploymentRemarks?: string | null;
};

export type UpdateOpenDeploymentInput =
  | UpdateLaptopStaffHandoverInput
  | UpdateLaptopPlaceHandoverInput
  | UpdatePlaceDeploymentInput;

export type ReturnLaptopStaffInput = {
  handoverStaffId: number;
  returnedBy: string;
  returnDate: string;
  returnTime?: string | null;
  returnPlace?: string | null;
  condition?: string | null;
  returnRemarks?: string | null;
  returnedByName: string;
};

export type ReturnLaptopPlaceInput = {
  handoverId: number;
  returnedBy: string;
  returnDate: string;
  returnTime?: string | null;
  returnPlace?: string | null;
  condition?: string | null;
  returnRemarks?: string | null;
  returnedByName: string;
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
  if (condition?.trim().toLowerCase() === 'bad') return STATUS_ID.PRE_DISPOSED;
  return STATUS_ID.RETURN;
}

export function getDeployTargetStatusId(): number {
  return STATUS_ID.DEPLOY;
}
