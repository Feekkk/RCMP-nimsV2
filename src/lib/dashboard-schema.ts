export type DashboardRequestStatus = 'preparing' | 'checkout' | 'in_use' | 'due_return';

export const DASHBOARD_REQUEST_STATUS_LABEL: Record<DashboardRequestStatus, string> = {
  preparing: 'Preparing',
  checkout: 'Ready to checkout',
  in_use: 'In use',
  due_return: 'Due for return',
};

export type DashboardRequestWorkflowKey = DashboardRequestStatus | 'completed';

export const DASHBOARD_REQUEST_WORKFLOW_LABEL: Record<DashboardRequestWorkflowKey, string> = {
  ...DASHBOARD_REQUEST_STATUS_LABEL,
  completed: 'Completed',
};

export const DASHBOARD_REQUEST_WORKFLOW_KEYS = [
  'preparing',
  'checkout',
  'in_use',
  'due_return',
  'completed',
] as const satisfies readonly DashboardRequestWorkflowKey[];

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

export const DASHBOARD_ASSET_STORE_STATUS_IDS = [1, 2, 4, 5] as const;
export const DASHBOARD_ASSET_DEPLOY_STATUS_IDS = [3] as const;
export const DASHBOARD_ASSET_STATUS_IDS = [1, 2, 3, 4, 5] as const;
export const DASHBOARD_REQUEST_STATUS_IDS = [6, 7, 8] as const;

export type DashboardStatusCount = {
  statusId: number;
  count: number;
};

export type DashboardDivisionCount = {
  division: string;
  count: number;
};

export type DashboardBuildingCount = {
  building: string;
  count: number;
};

export type DashboardAssetKindStats = {
  store: number;
  deploy: number;
  total: number;
  registeredTotal: number;
  byStatus: DashboardStatusCount[];
  deployByDivision?: DashboardDivisionCount[];
  deployByBuilding?: DashboardBuildingCount[];
};

export type DashboardRequestWorkflowCount = {
  key: DashboardRequestWorkflowKey;
  count: number;
};

export type DashboardRequestKindCount = {
  kind: 'laptop' | 'av' | 'network';
  count: number;
};

export type DashboardRequestStats = {
  total: number;
  byWorkflow: DashboardRequestWorkflowCount[];
  poolByKind: DashboardRequestKindCount[];
};

export type TechnicianDashboardStats = {
  laptop: DashboardAssetKindStats;
  av: DashboardAssetKindStats;
  network: DashboardAssetKindStats;
  totalRequest: DashboardRequestStats;
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
