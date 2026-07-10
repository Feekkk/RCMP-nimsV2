import type { RowDataPacket } from 'mysql2';
import type { HandoverNotificationData } from '@/lib/handover-pdf-types';
import { getDisplayNameByOid } from '@/server/azure-directory.server';
import { getDbPool } from '@/server/db';

type HandoverRow = RowDataPacket & {
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
  handled_by_name: string | null;
  handed_by_oid: string | null;
  handed_by_role: string | null;
};

function formatDateOnly(val: Date | string): string {
  if (val instanceof Date) return val.toISOString().slice(0, 10);
  return String(val).slice(0, 10);
}

/**
 * Single query (+ Azure lookup only when the technician name wasn't captured at handover time) shared
 * by both the handover PDF and the handover notification email — avoids duplicate DB/Graph round-trips.
 */
export async function getHandoverNotificationData(
  handoverId: number,
): Promise<HandoverNotificationData | null> {
  const pool = getDbPool();
  const [rows] = await pool.query<HandoverRow[]>(
    `SELECT h.handover_id, h.asset_id, h.handover_date, h.handover_remarks,
            hs.employee_no, s.full_name AS recipient_name, s.email AS recipient_email, s.department,
            l.brand, l.model, l.category, l.serial_num, l.remarks,
            h.handled_by_name, u.oid AS handed_by_oid, r.name AS handed_by_role
     FROM handover h
     INNER JOIN laptop l ON l.asset_id = h.asset_id
     INNER JOIN users u ON u.id = h.user_id
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
    throw new Error(
      'A staff recipient is required to generate the handover PDF. Select a staff member who received the equipment.',
    );
  }

  const handedByName =
    row.handled_by_name?.trim() || (await getDisplayNameByOid(row.handed_by_oid));

  const itemName =
    row.category?.trim() ||
    (row.model?.trim() ? `${row.model} Notebook/Desktop` : 'Notebook/Desktop');

  return {
    handoverId: row.handover_id,
    assetId: row.asset_id,
    handoverDate: formatDateOnly(row.handover_date),
    recipientName: row.recipient_name,
    recipientEmail: row.recipient_email?.trim() || null,
    employeeNo: row.employee_no,
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
