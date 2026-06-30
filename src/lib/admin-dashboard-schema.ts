import type { TechnicianDashboardCharts } from '@/lib/dashboard-schema';

export type AdminPeriodDays = 7 | 30 | 90;

export type AdminDashboardStats = {
  totalAssets: number;
  registeredUsers: number;
  requestsInPeriod: number;
  onLoanNow: number;
};

export type RoleCountSlice = {
  roleName: string;
  count: number;
};

export type TopRequesterRow = {
  staffId: string;
  fullName: string;
  requestCount: number;
};

export type RecentRejectionRow = {
  requestId: number;
  rejectedAt: string;
  requesterName: string;
  programType: string;
  rejectionReason: string;
};

export type LifecycleSnapshot = {
  deployedAssets: number;
  openRepairs: number;
  disposalsInPeriod: number;
  warrantiesExpiringSoon: number;
};

export type AdminDashboardData = {
  periodDays: AdminPeriodDays;
  stats: AdminDashboardStats;
  charts: TechnicianDashboardCharts;
  usersByRole: RoleCountSlice[];
  topRequesters: TopRequesterRow[];
  recentRejections: RecentRejectionRow[];
  lifecycle: LifecycleSnapshot;
};
