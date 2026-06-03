import type { RowDataPacket } from 'mysql2';
import type { HandoverPdfData } from '@/lib/handover-pdf-types';
import { getDbPool } from '@/server/db';

type HandoverRow = RowDataPacket & {
  handover_id: number;
  asset_id: number;
  handover_date: Date | string;
  handover_remarks: string | null;
  employee_no: string | null;
  recipient_name: string | null;
  department: string | null;
  brand: string | null;
  model: string | null;
  category: string | null;
  serial_num: string | null;
  remarks: string | null;
  handed_by_name: string | null;
  handed_by_role: string | null;
};

function formatDateOnly(val: Date | string): string {
  if (val instanceof Date) return val.toISOString().slice(0, 10);
  return String(val).slice(0, 10);
}

export async function getHandoverPdfData(handoverId: number): Promise<HandoverPdfData | null> {
  const pool = getDbPool();
  const [rows] = await pool.query<HandoverRow[]>(
    `SELECT h.handover_id, h.asset_id, h.handover_date, h.handover_remarks,
            hs.employee_no, s.full_name AS recipient_name, s.department,
            l.brand, l.model, l.category, l.serial_num, l.remarks,
            u.full_name AS handed_by_name, r.name AS handed_by_role
     FROM handover h
     INNER JOIN laptop l ON l.asset_id = h.asset_id
     INNER JOIN users u ON u.staff_id = h.staff_id
     INNER JOIN role r ON r.id = u.role_id
     LEFT JOIN handover_staff hs ON hs.handover_id = h.handover_id
     LEFT JOIN staff s ON s.employee_no = hs.employee_no
     WHERE h.handover_id = ?
     LIMIT 1`,
    [handoverId],
  );

  const row = rows[0];
  if (!row) return null;
  if (!row.employee_no || !row.recipient_name) {
    throw new Error('Handover PDF requires a staff recipient (handover_staff record)');
  }

  const itemName =
    row.category?.trim() ||
    (row.model?.trim() ? `${row.model} Notebook/Desktop` : 'Notebook/Desktop');

  return {
    handoverId: row.handover_id,
    assetId: row.asset_id,
    handoverDate: formatDateOnly(row.handover_date),
    recipientName: row.recipient_name,
    employeeNo: row.employee_no,
    employeeDesignation: row.department?.trim() || '—',
    itemName,
    brandName: row.brand?.trim() || '—',
    modelName: row.model?.trim() || '—',
    serialNumber: row.serial_num?.trim() || '—',
    adapter: '—',
    remark: row.handover_remarks?.trim() || row.remarks?.trim() || '—',
    handoverByName: row.handed_by_name?.trim() || '—',
    handoverByDesignation: row.handed_by_role?.trim() || 'IT Department',
  };
}
