import type { HandoverPdfData } from '@shared/lib/handover-pdf-types';

export type HandoverEmailData = HandoverPdfData & {
  recipientEmail: string;
};

export type SendHandoverEmailResult = {
  messageId: string;
  to: string;
  cc: string;
};
