import type { RowDataPacket } from 'mysql2';
import type { ReturnEmailData } from '@/lib/return-email-types';
import { getDbPool } from '@/server/db';

type ReturnEmailRow = RowDataPacket & {
  return_id: number;
  asset_id: number;
  return_date: Date | string;
  condition: string | null;
  return_remarks: string | null;
  employee_no: string | null;
  recipient_name: string | null;
  recipient_email: string | null;
  department: string | null;
  brand: string | null;
  model: string | null;
  category: string | null;
  serial_num: string | null;
  returned_by_name: string | null;
  returned_by_role: string | null;
};

function formatDateOnly(val: Date | string): string {
  if (val instanceof Date) return val.toISOString().slice(0, 10);
  return String(val).slice(0, 10);
}

function displayCondition(condition: string | null): string {
  const c = condition?.trim() || 'Good';
  if (c.toLowerCase() === 'good') return 'OK';
  return c;
}

export async function getReturnEmailData(returnId: number): Promise<ReturnEmailData | null> {
  const pool = getDbPool();
  const [rows] = await pool.query<ReturnEmailRow[]>(
    `SELECT hr.return_id, h.asset_id, hr.return_date, hr.\`condition\`, hr.return_remarks,
            hs.employee_no, s.full_name AS recipient_name, s.email AS recipient_email, s.department,
            l.brand, l.model, l.category, l.serial_num,
            u.full_name AS returned_by_name, r.name AS returned_by_role
     FROM handover_return hr
     INNER JOIN handover_staff hs ON hs.handover_staff_id = hr.handover_staff_id
     INNER JOIN handover h ON h.handover_id = hs.handover_id
     INNER JOIN laptop l ON l.asset_id = h.asset_id
     INNER JOIN staff s ON s.employee_no = hs.employee_no
     INNER JOIN users u ON u.staff_id = hr.returned_by
     INNER JOIN role r ON r.id = u.role_id
     WHERE hr.return_id = ?
     LIMIT 1`,
    [returnId],
  );

  const row = rows[0];
  if (!row) return null;

  const email = row.recipient_email?.trim();
  if (!email || !email.includes('@')) {
    throw new Error(
      `Staff recipient "${row.recipient_name ?? row.employee_no}" has no email in the directory. Add an email in staff records before sending.`,
    );
  }

  const itemName =
    row.category?.trim() ||
    (row.model?.trim() ? `${row.model} Notebook/Desktop` : 'Notebook/Desktop');

  return {
    returnId: row.return_id,
    assetId: row.asset_id,
    returnDate: formatDateOnly(row.return_date),
    recipientName: row.recipient_name?.trim() || '—',
    recipientEmail: email,
    employeeNo: row.employee_no?.trim() || '—',
    designation: row.department?.trim() || '—',
    department: row.department?.trim() || '—',
    itemName,
    brandName: row.brand?.trim() || '—',
    modelName: row.model?.trim() || '—',
    serialNumber: row.serial_num?.trim() || '—',
    conditionDisplay: displayCondition(row.condition),
    returnRemarks: row.return_remarks?.trim() || '—',
    handoverByName: row.returned_by_name?.trim() || '—',
    handoverByDesignation: row.returned_by_role?.trim() || 'IT Department',
  };
}
