import { REQUEST_IT_EMAIL } from '@/lib/request-email-types';
import type { RequestEmailItem } from '@/lib/request-email-types';

export { REQUEST_IT_EMAIL };

export type RequestReturnEmailAsset = {
  assignmentId: number;
  assetId: number;
  kind: 'laptop' | 'av';
  assetType: string;
  model: string;
  brand: string;
  serialNum: string;
  checkoutAt: string;
  returnedAt: string;
  returnCondition: string;
};

export type RequestReturnEmailData = {
  requestId: number;
  requestedBy: string;
  requesterName: string;
  requesterEmail: string;
  requesterPhone: string | null;
  borrowDate: string;
  returnDate: string;
  programType: string;
  usageLocation: string;
  reason: string | null;
  submittedAt: string;
  requestedItems: RequestEmailItem[];
  returnedByName: string;
  returnedByStaffId: string;
  returnedAt: string;
  returnCondition: string;
  returnRemarks: string | null;
  assets: RequestReturnEmailAsset[];
};

export type SendRequestReturnEmailInput = {
  requestId: number;
  returnedBy: string;
  assignmentIds: number[];
  returnCondition: string;
  remarks?: string | null;
};

export type SendRequestReturnEmailResult = {
  messageId: string;
  to: string;
  cc: string;
};
