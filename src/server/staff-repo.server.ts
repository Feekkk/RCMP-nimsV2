import type { RowDataPacket } from 'mysql2';
import type { CreateStaffInput, StaffDirectoryRow, StaffDivision, UpdateStaffInput } from '@/lib/staff-schema';
import { STAFF_DIVISIONS } from '@/lib/staff-schema';
import { getDbPool } from '@/server/db';

export async function listStaffDirectory(): Promise<StaffDirectoryRow[]> {
  const pool = getDbPool();
  const [rows] = await pool.query<
    (RowDataPacket & {
      employee_no: string;
      full_name: string;
      department: string | null;
      division: string | null;
      email: string | null;
      phone: string | null;
      remarks: string | null;
      created_at: Date | string;
      updated_at: Date | string;
    })[]
  >(
    `SELECT employee_no, full_name, department, division, email, phone, remarks, created_at, updated_at
     FROM staff
     ORDER BY full_name`,
  );

  return rows.map((r) => ({
    employeeNo: r.employee_no,
    fullName: r.full_name,
    department: r.department,
    division: r.division,
    email: r.email,
    phone: r.phone,
    remarks: r.remarks,
    createdAt: String(r.created_at),
    updatedAt: String(r.updated_at),
  }));
}

function validateStaffFields(input: {
  employeeNo: string;
  fullName: string;
  division: string;
}): { employeeNo: string; fullName: string; division: StaffDivision } {
  const employeeNo = input.employeeNo.trim();
  const fullName = input.fullName.trim();
  const division = input.division.trim();

  if (!employeeNo) {
    throw new Error('Employee number is required.');
  }
  if (!fullName) {
    throw new Error('Full name is required.');
  }
  if (!division) {
    throw new Error('Division is required.');
  }
  if (!STAFF_DIVISIONS.includes(division as StaffDivision)) {
    throw new Error('Division must be Services or Academic.');
  }

  return { employeeNo, fullName, division: division as StaffDivision };
}

export async function createStaff(input: CreateStaffInput): Promise<StaffDirectoryRow> {
  const { employeeNo, fullName, division } = validateStaffFields(input);

  const pool = getDbPool();
  const [existing] = await pool.query<RowDataPacket[]>(
    `SELECT employee_no FROM staff WHERE employee_no = ? LIMIT 1`,
    [employeeNo],
  );
  if (existing.length > 0) {
    throw new Error('A staff member with this employee number already exists.');
  }

  await pool.execute(
    `INSERT INTO staff (employee_no, full_name, department, division, email, phone, remarks)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      employeeNo,
      fullName,
      input.department?.trim() || null,
      division,
      input.email?.trim() || null,
      input.phone?.trim() || null,
      input.remarks?.trim() || null,
    ],
  );

  const rows = await listStaffDirectory();
  const created = rows.find((row) => row.employeeNo === employeeNo);
  if (!created) {
    throw new Error('Staff could not be created. Try again.');
  }
  return created;
}

export async function updateStaff(input: UpdateStaffInput): Promise<StaffDirectoryRow> {
  const { employeeNo, fullName, division } = validateStaffFields(input);

  const pool = getDbPool();
  const [existing] = await pool.query<RowDataPacket[]>(
    `SELECT employee_no FROM staff WHERE employee_no = ? LIMIT 1`,
    [employeeNo],
  );
  if (existing.length === 0) {
    throw new Error('Staff member not found. Refresh the page and try again.');
  }

  await pool.execute(
    `UPDATE staff
     SET full_name = ?, department = ?, division = ?, email = ?, phone = ?, remarks = ?
     WHERE employee_no = ?`,
    [
      fullName,
      input.department?.trim() || null,
      division,
      input.email?.trim() || null,
      input.phone?.trim() || null,
      input.remarks?.trim() || null,
      employeeNo,
    ],
  );

  const rows = await listStaffDirectory();
  const updated = rows.find((row) => row.employeeNo === employeeNo);
  if (!updated) {
    throw new Error('Staff could not be updated. Try again.');
  }
  return updated;
}
