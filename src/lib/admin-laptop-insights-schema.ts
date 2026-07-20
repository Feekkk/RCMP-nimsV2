export type LaptopDepartmentStaffHandover = {
  employeeNo: string;
  fullName: string;
  assetIds: number[];
};

export type LaptopDepartmentHandover = {
  department: string;
  staff: LaptopDepartmentStaffHandover[];
};
