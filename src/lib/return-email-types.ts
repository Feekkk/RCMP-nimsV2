import type { ReturnPdfData } from '@/lib/return-pdf-types';

export const RETURN_IT_CC = 'it.rcmp@unikl.edu.my';

export type ReturnEmailData = ReturnPdfData & {
  recipientEmail: string;
};

export type SendReturnEmailResult = {
  messageId: string;
  to: string;
  cc: string;
};
