export const REQUEST_IT_EMAIL = 'itd.rcmp@unikl.edu.my';

export type RequestEmailItem = {
  assetType: string;
  quantity: number;
};

export type RequestEmailData = {
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
  termsAcceptedAt: string | null;
  items: RequestEmailItem[];
};

export type SendRequestEmailResult = {
  messageId: string;
  to: string[];
};
