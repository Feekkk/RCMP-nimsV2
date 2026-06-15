import type { RowDataPacket } from 'mysql2';
import type { ReturnPdfData } from '@/lib/return-pdf-types';
import { getDisplayNameByOid } from '@/server/azure-directory.server';
import { getDbPool } from '@/server/db';

type ReturnRow = RowDataPacket & {
  return_id: number;
  asset_id: number;
  return_date: Date | string;
  condition: string | null;
  return_remarks: string | null;
  employee_no: string | null;
  recipient_name: string | null;
  department: string | null;
  brand: string | null;
  model: string | null;
  category: string | null;
  serial_num: string | null;
  returned_by_oid: string | null;
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

export async function getReturnPdfData(returnId: number): Promise<ReturnPdfData | null> {
  const pool = getDbPool();
  const [rows] = await pool.query<ReturnRow[]>(
    `SELECT hr.return_id, h.asset_id, hr.return_date, hr.\`condition\`, hr.return_remarks,
            hs.employee_no, s.full_name AS recipient_name, s.department,
            l.brand, l.model, l.category, l.serial_num,
            u.oid AS returned_by_oid, r.name AS returned_by_role
     FROM handover_return hr
     LEFT JOIN handover_staff hs ON hs.handover_staff_id = hr.handover_staff_id
     INNER JOIN handover h ON h.handover_id = COALESCE(hs.handover_id, hr.handover_id)
     INNER JOIN laptop l ON l.asset_id = h.asset_id
     LEFT JOIN staff s ON s.employee_no = hs.employee_no
     INNER JOIN users u ON u.id = hr.returned_by
     INNER JOIN role r ON r.id = u.role_id
     WHERE hr.return_id = ?
     LIMIT 1`,
    [returnId],
  );

  const row = rows[0];
  if (!row) return null;

  const returnedByName = await getDisplayNameByOid(row.returned_by_oid);

  const itemName =
    row.category?.trim() ||
    (row.model?.trim() ? `${row.model} Notebook/Desktop` : 'Notebook/Desktop');

  return {
    returnId: row.return_id,
    assetId: row.asset_id,
    returnDate: formatDateOnly(row.return_date),
    recipientName: row.recipient_name?.trim() || '—',
    employeeNo: row.employee_no?.trim() || '—',
    designation: row.department?.trim() || '—',
    department: row.department?.trim() || '—',
    itemName,
    brandName: row.brand?.trim() || '—',
    modelName: row.model?.trim() || '—',
    serialNumber: row.serial_num?.trim() || '—',
    conditionDisplay: displayCondition(row.condition),
    returnRemarks: row.return_remarks?.trim() || '—',
    handoverByName: returnedByName || '—',
    handoverByDesignation: row.returned_by_role?.trim() || 'IT Department',
  };
}
