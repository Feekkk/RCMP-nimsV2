import { REQUEST_IT_EMAIL } from '@/lib/request-email-types';
import type { RequestEmailItem } from '@/lib/request-email-types';

export { REQUEST_IT_EMAIL };

export type OverdueReturnEmailAsset = {
  assignmentId: number;
  assetId: number;
  kind: 'laptop' | 'av';
  assetType: string;
  model: string;
  brand: string;
  serialNum: string;
  checkoutAt: string;
};

export type OverdueReturnEmailData = {
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
  daysOverdue: number;
  outstandingCount: number;
  assets: OverdueReturnEmailAsset[];
};

export type SendOverdueReturnEmailResult = {
  messageId: string;
  to: string;
  cc: string;
};

export type OverdueReturnEmailJobDetail = {
  requestId: number;
  status: 'sent' | 'failed';
  error?: string;
};

export type OverdueReturnEmailJobResult = {
  runDate: string;
  sent: number;
  failed: number;
  skippedReason?: string;
  details: OverdueReturnEmailJobDetail[];
};
