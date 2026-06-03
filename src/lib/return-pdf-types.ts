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
