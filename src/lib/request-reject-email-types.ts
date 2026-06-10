import { REQUEST_IT_EMAIL } from '@/lib/request-email-types';

export { REQUEST_IT_EMAIL };

export type RequestRejectEmailItem = {
  assetType: string;
  quantity: number;
};

export type RequestRejectEmailData = {
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
  rejectedAt: string;
  rejectedBy: string;
  rejectedByName: string;
  rejectionReason: string;
  items: RequestRejectEmailItem[];
};

export type SendRequestRejectEmailResult = {
  messageId: string;
  to: string;
  cc: string;
};
