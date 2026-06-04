export type AdminUserRow = {
  staffId: string;
  fullName: string;
  email: string;
  roleId: number;
  roleName: string;
  authProvider: 'local' | 'microsoft';
  phone: string | null;
  lastLoginAt: string | null;
  createdAt: string;
};

export type CreateAdminUserInput = {
  staffId: string;
  fullName: string;
  email: string;
  roleId: number;
  phone?: string;
  password?: string;
};

export type UpdateAdminUserInput = {
  staffId: string;
  fullName: string;
  email: string;
  roleId: number;
  phone: string | null;
  password?: string;
};
