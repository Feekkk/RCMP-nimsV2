export type RequestTopRequesterRow = {
  staffId: string;
  fullName: string;
  requestCount: number;
};

export type RequestProgramTypeRow = {
  programType: string;
  count: number;
};

export type RecentRequestRow = {
  requestId: number;
  requesterName: string;
  programType: string;
  borrowDate: string;
  returnDate: string;
  createdAt: string;
};

export type AdminRequestInsights = {
  monthLabel: string;
  topRequesters: RequestTopRequesterRow[];
  programTypes: RequestProgramTypeRow[];
  recentRequests: RecentRequestRow[];
};
