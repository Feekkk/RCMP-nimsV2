/** status_id 9 — active (request) */
export const REQUEST_STATUS_ACTIVE = 9;

export type RequestAssignableKind = 'laptop' | 'av';

export type RequestPoolAsset = {
  kind: RequestAssignableKind;
  assetId: number;
  model: string | null;
  brand: string | null;
  category: string | null;
  serialNum: string | null;
  statusId: number;
  /** Open assignment to a user request, if any */
  requestId: number | null;
  requesterName: string | null;
  assignmentId: number | null;
};

export type ActiveForRequestAsset = {
  kind: RequestAssignableKind;
  assetId: number;
  model: string | null;
  brand: string | null;
  category: string | null;
  serialNum: string | null;
  statusId: number;
};

export type RequestItemRow = {
  requestItemId: number;
  assetType: string;
  quantity: number;
};

export type RequestAssignmentRow = {
  assignmentId: number;
  requestItemId: number | null;
  assetId: number;
  kind: RequestAssignableKind;
  model: string | null;
  brand: string | null;
  assignedAt: string | null;
};

export type PendingRequest = {
  requestId: number;
  requestedBy: string;
  requesterName: string;
  borrowDate: string;
  returnDate: string;
  programType: string;
  usageLocation: string;
  reason: string | null;
  createdAt: string;
  items: RequestItemRow[];
  assignments: RequestAssignmentRow[];
};

export type AssignAssetToRequestInput = {
  requestId: number;
  requestItemId: number | null;
  kind: RequestAssignableKind;
  assetId: number;
  assignedBy: string;
  remarks: string | null;
};

export type MarkAssetForRequestInput = {
  kind: RequestAssignableKind;
  assetId: number;
};

export type MarkAssetsForRequestInput = {
  assets: MarkAssetForRequestInput[];
};

export type MarkAssetsForRequestResult = {
  updated: number;
  errors: string[];
};
