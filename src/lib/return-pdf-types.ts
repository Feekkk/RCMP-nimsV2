/** Data for UNIKL RCMP 1-page laptop/desktop return PDF. */
export type ReturnPdfData = {
  returnId: number;
  assetId: number;
  returnDate: string;
  recipientName: string;
  employeeNo: string;
  designation: string;
  department: string;
  itemName: string;
  brandName: string;
  modelName: string;
  serialNumber: string;
  conditionDisplay: string;
  returnRemarks: string;
  handoverByName: string;
  handoverByDesignation: string;
};

/** Superset of ReturnPdfData used to build both the PDF and the notification email from a single DB fetch. */
export type ReturnNotificationData = ReturnPdfData & {
  recipientEmail: string | null;
};

export type ReturnEmailStatus = 'pending' | 'sending' | 'sent' | 'failed';

export type ReturnEmailStatusInfo = {
  status: ReturnEmailStatus;
  error: string | null;
  sentAt: string | null;
};
