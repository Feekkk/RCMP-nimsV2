import type { RowDataPacket } from 'mysql2';
import type {
  LaptopDepartmentHandover,
  LaptopDepartmentStaffHandover,
} from '@/lib/admin-laptop-insights-schema';
import { getDbPool } from '@/server/db';

type DepartmentHandoverRow = RowDataPacket & {
  department: string;
  employee_no: string;
  full_name: string;
  asset_id: number;
};

export async function getLaptopDepartmentHandovers(): Promise<LaptopDepartmentHandover[]> {
  const pool = getDbPool();
  const [rows] = await pool.query<DepartmentHandoverRow[]>(
    `SELECT COALESCE(NULLIF(TRIM(s.department), ''), 'Unassigned') AS department,
            s.employee_no,
            s.full_name,
            h.asset_id
     FROM handover h
     INNER JOIN laptop l ON l.asset_id = h.asset_id
     INNER JOIN handover_staff hs ON hs.handover_id = h.handover_id
     INNER JOIN staff s ON s.employee_no = hs.employee_no
     ORDER BY department ASC, s.full_name ASC, h.asset_id ASC`,
  );

  const departmentMap = new Map<string, Map<string, LaptopDepartmentStaffHandover>>();

  for (const row of rows) {
    let staffMap = departmentMap.get(row.department);
    if (!staffMap) {
      staffMap = new Map();
      departmentMap.set(row.department, staffMap);
    }

    let staff = staffMap.get(row.employee_no);
    if (!staff) {
      staff = {
        employeeNo: row.employee_no,
        fullName: row.full_name,
        assetIds: [],
      };
      staffMap.set(row.employee_no, staff);
    }

    if (!staff.assetIds.includes(row.asset_id)) {
      staff.assetIds.push(row.asset_id);
    }
  }

  return [...departmentMap.entries()]
    .map(([department, staffMap]) => ({
      department,
      staff: [...staffMap.values()],
    }))
    .sort((a, b) => a.department.localeCompare(b.department));
}
