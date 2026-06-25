import { REQUEST_IT_EMAIL } from '@/lib/request-email-types';
import type { RequestEmailItem } from '@/lib/request-email-types';

export { REQUEST_IT_EMAIL };

export type CheckoutEmailAsset = {
  assignmentId: number;
  assetId: number;
  kind: 'laptop' | 'av';
  assetType: string;
  model: string;
  brand: string;
  serialNum: string;
  category: string;
  checkoutAt: string;
};

export type CheckoutEmailData = {
  requestId: number;
  requestedBy: string;
  requesterName: string;
  requesterEmail: string;
  requesterPhone: string | null;
  borrowDate: string;
  returnDate: string;
  programType: string;
  usageLocation: string;
  remarks: string | null;
  submittedAt: string;
  requestedItems: RequestEmailItem[];
  checkedOutByName: string;
  checkedOutByStaffId: string;
  checkedOutAt: string;
  assets: CheckoutEmailAsset[];
};

export type SendCheckoutEmailInput = {
  requestId: number;
  checkedOutBy: string;
  assignmentIds: number[];
};

export type SendCheckoutEmailResult = {
  messageId: string;
  to: string;
  cc: string;
};
