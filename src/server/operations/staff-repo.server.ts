import type { RowDataPacket } from 'mysql2';
import type {
  CreateStaffInput,
  StaffDirectoryRow,
  StaffDivision,
  StaffHandoverAsset,
  UpdateStaffInput,
} from '@/lib/staff-schema';
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

function formatDateOnly(val: Date | string): string {
  if (val instanceof Date) return val.toISOString().slice(0, 10);
  return String(val).slice(0, 10);
}

export async function listStaffHandoverAssets(employeeNo: string): Promise<StaffHandoverAsset[]> {
  const trimmed = employeeNo.trim();
  if (!trimmed) return [];

  const pool = getDbPool();
  const [rows] = await pool.query<
    (RowDataPacket & {
      asset_id: number;
      brand: string | null;
      model: string | null;
      category: string | null;
      serial_num: string | null;
      status_id: number;
      handover_id: number;
      handover_date: Date | string;
      handover_remarks: string | null;
    })[]
  >(
    `SELECT l.asset_id, l.brand, l.model, l.category, l.serial_num, l.status_id,
            h.handover_id, h.handover_date, h.handover_remarks
     FROM handover h
     INNER JOIN handover_staff hs ON hs.handover_id = h.handover_id
     INNER JOIN laptop l ON l.asset_id = h.asset_id
     LEFT JOIN handover_return hr ON hr.handover_staff_id = hs.handover_staff_id
     WHERE hs.employee_no = ? AND hr.return_id IS NULL
     ORDER BY h.handover_date DESC, h.handover_id DESC`,
    [trimmed],
  );

  return rows.map((r) => ({
    assetId: r.asset_id,
    brand: r.brand,
    model: r.model,
    category: r.category,
    serialNum: r.serial_num,
    statusId: r.status_id,
    handoverId: r.handover_id,
    handoverDate: formatDateOnly(r.handover_date),
    handoverRemarks: r.handover_remarks,
  }));
}
