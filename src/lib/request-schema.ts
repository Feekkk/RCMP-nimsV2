/** status_id 6 — active (request) */
export const REQUEST_STATUS_ACTIVE = 6;
/** status_id 7 — booked (request) */
export const REQUEST_STATUS_BOOKED = 7;
/** status_id 8 — checkout (request) */
export const REQUEST_STATUS_CHECKOUT = 8;

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
  /** Assignments already returned for this line */
  returnedCount: number;
};

export type RequestSlotMark = 'unavailable' | 'not_taken';

export type RequestAssignmentRow = {
  assignmentId: number;
  requestItemId: number | null;
  assetId: number | null;
  kind: RequestAssignableKind;
  model: string | null;
  brand: string | null;
  assignedAt: string | null;
  checkoutAt: string | null;
  /** Pool asset status; 0 when slot is unavailable (no asset). */
  assetStatusId: number;
  unavailable: boolean;
  /** Set when slot was closed without booking an asset. */
  slotMark: RequestSlotMark | null;
};

export type MarkRequestSlotUnavailableInput = {
  requestId: number;
  requestItemId: number;
  markedBy: string;
  remarks?: string | null;
};

export type MarkRequestSlotNotTakenInput = MarkRequestSlotUnavailableInput;

export type CancelBookedNotTakenInput = {
  assignmentId: number;
  cancelledBy: string;
};

export type CheckoutUserRequestInput = {
  requestId: number;
  checkedOutBy: string;
};

export type CheckoutUserRequestResult = {
  checkedOut: number;
  assignmentIds: number[];
};

export type CheckoutRequestAssignmentInput = {
  assignmentId: number;
  checkedOutBy: string;
};

/** Matches `request_assignment.return_condition` / `returned_by` / `remarks` */
export type ReturnRequestAssignmentInput = {
  assignmentId: number;
  returnedBy: string;
  returnCondition: string;
  remarks?: string | null;
};

/** Return all checked-out assets for a user request */
export type ReturnUserRequestInput = {
  requestId: number;
  returnedBy: string;
  returnCondition: string;
  remarks?: string | null;
};

export type ReturnUserRequestResult = {
  returned: number;
  assignmentIds: number[];
};

export type ChangeBookedAssignmentInput = {
  assignmentId: number;
  kind: RequestAssignableKind;
  assetId: number;
  changedBy: string;
};

export type RejectUserRequestInput = {
  requestId: number;
  rejectedBy: string;
  rejectionReason: string;
};

export type PendingRequest = {
  requestId: number;
  requestedBy: string;
  requesterName: string;
  borrowDate: string;
  returnDate: string;
  programType: string;
  usageLocation: string;
  remarks: string | null;
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

/** Schema comment: academic project/class, Official Event, Club/Society */
export const REQUEST_PROGRAM_TYPES = [
  'Academic project / class',
  'Official Event',
  'Club / Society',
  'Other',
] as const;

export type RequestProgramType = (typeof REQUEST_PROGRAM_TYPES)[number];

export type UserRequestItemDraft = {
  id: string;
  assetType: string;
  quantity: number;
};

export type SubmitUserRequestInput = {
  requestedBy: string;
  borrowDate: string;
  returnDate: string;
  programType: string;
  usageLocation: string;
  remarks: string | null;
  termsAcceptedAt: string;
  items: { assetType: string; quantity: number }[];
};

export type SubmitUserRequestResult = {
  requestId: number;
};

export type UserRequestHistoryStatus =
  | 'rejected'
  | 'completed'
  | 'in_use'
  | 'preparing'
  | 'submitted'
  | 'unavailable';

/** Per category line — counts only, no asset identifiers */
export type UserRequestItemProgress = {
  requestItemId: number;
  assetType: string;
  quantity: number;
  bookedCount: number;
  checkedOutCount: number;
  returnedCount: number;
  unavailableCount: number;
  notTakenCount: number;
};

export type UserRequestHistory = {
  requestId: number;
  borrowDate: string;
  returnDate: string;
  programType: string;
  usageLocation: string;
  remarks: string | null;
  createdAt: string;
  status: UserRequestHistoryStatus;
  rejectionReason: string | null;
  items: UserRequestItemProgress[];
};

export type RequestLogAssignment = {
  assignmentId: number;
  requestItemId: number | null;
  assetType: string | null;
  kind: RequestAssignableKind;
  assetId: number;
  model: string | null;
  brand: string | null;
  assignedAt: string | null;
  checkoutAt: string | null;
  returnedAt: string | null;
  returnCondition: string | null;
  assetStatusId: number;
};

export type RequestLogEntry = {
  requestId: number;
  requesterName: string;
  requestedBy: string;
  borrowDate: string;
  returnDate: string;
  programType: string;
  usageLocation: string;
  remarks: string | null;
  createdAt: string;
  rejectedAt: string | null;
  rejectionReason: string | null;
  items: RequestItemRow[];
  assignments: RequestLogAssignment[];
};
