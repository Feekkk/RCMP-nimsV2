import type { RowDataPacket } from 'mysql2';
import type { LaptopDepartmentCount } from '@/lib/admin-laptop-insights-schema';
import { getDbPool } from '@/server/db';

export async function getLaptopTopDepartments(): Promise<LaptopDepartmentCount[]> {
  const pool = getDbPool();
  const [rows] = await pool.query<(RowDataPacket & { department: string; cnt: number })[]>(
    `SELECT COALESCE(NULLIF(TRIM(s.department), ''), 'Unassigned') AS department,
            COUNT(DISTINCT h.handover_id) AS cnt
     FROM handover h
     INNER JOIN laptop l ON l.asset_id = h.asset_id
     INNER JOIN handover_staff hs ON hs.handover_id = h.handover_id
     INNER JOIN staff s ON s.employee_no = hs.employee_no
     GROUP BY department
     ORDER BY cnt DESC, department ASC
     LIMIT 5`,
  );
  return rows.map((row) => ({
    department: row.department,
    count: Number(row.cnt),
  }));
}
