/** Data for UNIKL RCMP 3-page laptop handover PDF (staff recipient). */
export type HandoverPdfData = {
  handoverId: number;
  assetId: number;
  handoverDate: string;
  recipientName: string;
  employeeNo: string;
  employeeDesignation: string;
  itemName: string;
  brandName: string;
  modelName: string;
  serialNumber: string;
  adapter: string;
  remark: string;
  handoverByName: string;
  handoverByDesignation: string;
};

/** Superset of HandoverPdfData used to build both the PDF and the notification email from a single DB fetch. */
export type HandoverNotificationData = HandoverPdfData & {
  recipientEmail: string | null;
};

export type HandoverEmailStatus = 'pending' | 'sending' | 'sent' | 'failed';

export type HandoverEmailStatusInfo = {
  status: HandoverEmailStatus;
  error: string | null;
  sentAt: string | null;
};
