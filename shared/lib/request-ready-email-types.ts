import { REQUEST_IT_EMAIL } from '@shared/lib/request-email-types';

export { REQUEST_IT_EMAIL };

export const REQUEST_COLLECTION_LOCATION = 'ITD Office, Level 1 Avicenna building';

export type RequestReadyEmailData = {
  requestId: number;
  requesterName: string;
  requesterEmail: string;
  borrowDate: string;
  returnDate: string;
};

export type SendRequestReadyEmailResult = {
  messageId: string;
  to: string;
  cc: string;
};
