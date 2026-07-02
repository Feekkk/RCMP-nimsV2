export const STAFF_DIVISIONS = ['Services', 'Academic'] as const;

export type StaffDivision = (typeof STAFF_DIVISIONS)[number];

export type StaffDirectoryRow = {
  employeeNo: string;
  fullName: string;
  department: string | null;
  division: string | null;
  email: string | null;
  phone: string | null;
  remarks: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateStaffInput = {
  employeeNo: string;
  fullName: string;
  division: StaffDivision;
  department?: string | null;
  email?: string | null;
  phone?: string | null;
  remarks?: string | null;
};

export type UpdateStaffInput = {
  employeeNo: string;
  fullName: string;
  division: StaffDivision;
  department?: string | null;
  email?: string | null;
  phone?: string | null;
  remarks?: string | null;
};
