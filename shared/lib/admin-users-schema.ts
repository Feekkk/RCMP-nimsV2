export type AdminUserRow = {
  staffId: string;
  fullName: string;
  email: string;
  roleId: number;
  roleName: string;
  phone: string | null;
  lastLoginAt: string | null;
  createdAt: string;
};

export type CreateAdminUserInput = {
  email: string;
  roleId: number;
  phone?: string;
};

export type UpdateAdminUserInput = {
  staffId: string;
  email: string;
  roleId: number;
  phone: string | null;
};
