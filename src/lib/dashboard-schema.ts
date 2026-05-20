export type DashboardRequestStatus = 'preparing' | 'checkout' | 'in_use' | 'due_return';

export const DASHBOARD_REQUEST_STATUS_LABEL: Record<DashboardRequestStatus, string> = {
  preparing: 'Preparing',
  checkout: 'Ready to checkout',
  in_use: 'In use',
  due_return: 'Due for return',
};

export type DashboardTimetableEntry = {
  requestId: number;
  requesterName: string;
  borrowDate: string;
  returnDate: string;
  programType: string;
  usageLocation: string;
  itemSummary: string;
  totalQty: number;
  status: DashboardRequestStatus;
  needsAction: boolean;
};

export type TechnicianDashboardStats = {
  pendingRequests: number;
  awaitingCheckout: number;
  checkedOut: number;
  requestPoolCount: number;
  laptopCount: number;
  avCount: number;
  networkCount: number;
};

export type DashboardTrendPoint = {
  label: string;
  iso: string;
  submitted: number;
  dueReturn: number;
};

export type DashboardProgramStackPoint = {
  label: string;
  iso: string;
  [program: string]: string | number;
};

export type DashboardInventorySlice = {
  kind: string;
  active: number;
  deploy: number;
  requestFlow: number;
  maintenance: number;
};

export type TechnicianDashboardCharts = {
  requestTrend: DashboardTrendPoint[];
  requestsByProgram: DashboardProgramStackPoint[];
  programKeys: string[];
  inventoryMix: DashboardInventorySlice[];
  sparklines: {
    pending: number[];
    checkout: number[];
    onLoan: number[];
    pool: number[];
  };
};

export type TechnicianDashboardData = {
  stats: TechnicianDashboardStats;
  timetable: DashboardTimetableEntry[];
  weekStart: string;
  weekEnd: string;
  charts: TechnicianDashboardCharts;
};
