import type { RowDataPacket } from 'mysql2';
import type { HandoverEmailData } from '@/lib/handover-email-types';
import { getDisplayNameByOid } from '@/server/azure-directory.server';
import { getDbPool } from '@/server/db';

type HandoverEmailRow = RowDataPacket & {
  handover_id: number;
  asset_id: number;
  handover_date: Date | string;
  handover_remarks: string | null;
  employee_no: string | null;
  recipient_name: string | null;
  recipient_email: string | null;
  department: string | null;
  brand: string | null;
  model: string | null;
  category: string | null;
  serial_num: string | null;
  remarks: string | null;
  handed_by_oid: string | null;
  handed_by_role: string | null;
};

function formatDateOnly(val: Date | string): string {
  if (val instanceof Date) return val.toISOString().slice(0, 10);
  return String(val).slice(0, 10);
}

export async function getHandoverEmailData(handoverId: number): Promise<HandoverEmailData | null> {
  const pool = getDbPool();
  const [rows] = await pool.query<HandoverEmailRow[]>(
    `SELECT h.handover_id, h.asset_id, h.handover_date, h.handover_remarks,
            hs.employee_no, s.full_name AS recipient_name, s.email AS recipient_email, s.department,
            l.brand, l.model, l.category, l.serial_num, l.remarks,
            u.oid AS handed_by_oid, r.name AS handed_by_role
     FROM handover h
     INNER JOIN laptop l ON l.asset_id = h.asset_id
     INNER JOIN users u ON u.id = h.user_id
     INNER JOIN role r ON r.id = u.role_id
     INNER JOIN handover_staff hs ON hs.handover_id = h.handover_id
     INNER JOIN staff s ON s.employee_no = hs.employee_no
     WHERE h.handover_id = ?
     LIMIT 1`,
    [handoverId],
  );

  const row = rows[0];
  if (!row) return null;

  const handedByName = await getDisplayNameByOid(row.handed_by_oid);

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
    handoverId: row.handover_id,
    assetId: row.asset_id,
    handoverDate: formatDateOnly(row.handover_date),
    recipientName: row.recipient_name?.trim() || '—',
    recipientEmail: email,
    employeeNo: row.employee_no?.trim() || '—',
    employeeDesignation: row.department?.trim() || '—',
    itemName,
    brandName: row.brand?.trim() || '—',
    modelName: row.model?.trim() || '—',
    serialNumber: row.serial_num?.trim() || '—',
    adapter: '—',
    remark: row.handover_remarks?.trim() || row.remarks?.trim() || '—',
    handoverByName: handedByName || '—',
    handoverByDesignation: row.handed_by_role?.trim() || 'IT Department',
  };
}
