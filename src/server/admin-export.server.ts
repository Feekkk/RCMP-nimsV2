import type { RowDataPacket } from 'mysql2';
import { attachDisplayNames, getDirectoryUsersByOids } from '@/server/azure-directory.server';
import { getDbPool } from '@/server/db';

export type AdminExportKind = 'users' | 'requests' | 'laptop' | 'av' | 'network' | 'staff';

export type AdminExportResult = {
  filename: string;
  contentType: string;
  body: string;
};

function escapeCsvCell(val: unknown): string {
  const s = val == null ? '' : String(val);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function toCsv(headers: string[], rows: unknown[][]): string {
  const lines = [headers.map(escapeCsvCell).join(',')];
  for (const row of rows) {
    lines.push(row.map(escapeCsvCell).join(','));
  }
  return lines.join('\r\n');
}

export async function exportAdminCsv(kind: AdminExportKind): Promise<AdminExportResult> {
  const pool = getDbPool();
  const stamp = new Date().toISOString().slice(0, 10);

  if (kind === 'users') {
    const [rows] = await pool.query<
      (RowDataPacket & {
        id: number;
        oid: string | null;
        full_name: string;
        email: string;
        role_name: string;
        phone: string | null;
        last_login_at: Date | string | null;
        created_at: Date | string;
      })[]
    >(
      `SELECT u.id, u.oid, u.email, r.name AS role_name,
              u.phone, u.last_login_at, u.created_at
       FROM users u INNER JOIN role r ON r.id = u.role_id
       ORDER BY u.id`,
    );
    await attachDisplayNames(rows, 'oid', 'full_name');
    const directory = await getDirectoryUsersByOids(rows.map((r) => r.oid));
    return {
      filename: `nims-users-${stamp}.csv`,
      contentType: 'text/csv;charset=utf-8',
      body: toCsv(
        ['id', 'full_name', 'email', 'role', 'phone', 'last_login_at', 'created_at'],
        rows.map((r) => {
          const d = r.oid?.trim() ? directory.get(r.oid.trim()) : undefined;
          const email = (d?.email ?? r.email).trim();
          return [
            r.id,
            r.full_name,
            email,
            r.role_name,
            d?.phone ?? r.phone,
            r.last_login_at,
            r.created_at,
          ];
        }),
      ),
    };
  }

  if (kind === 'requests') {
    const [rows] = await pool.query<
      (RowDataPacket & {
        request_id: number;
        requester_oid: string | null;
        requester: string;
        borrow_date: Date | string;
        return_date: Date | string;
        program_type: string;
        usage_location: string;
        rejected_at: Date | string | null;
        created_at: Date | string;
        items: string | null;
      })[]
    >(
      `SELECT r.request_id, u.oid AS requester_oid, r.borrow_date, r.return_date,
              r.program_type, r.usage_location, r.rejected_at, r.created_at,
              (SELECT GROUP_CONCAT(CONCAT(ri.asset_type, ' x', ri.quantity) SEPARATOR '; ')
               FROM request_item ri WHERE ri.request_id = r.request_id) AS items
       FROM request r
       INNER JOIN users u ON u.id = r.requested_by
       ORDER BY r.request_id DESC`,
    );
    await attachDisplayNames(rows, 'requester_oid', 'requester');
    return {
      filename: `nims-requests-${stamp}.csv`,
      contentType: 'text/csv;charset=utf-8',
      body: toCsv(
        [
          'request_id',
          'requester',
          'borrow_date',
          'return_date',
          'program_type',
          'usage_location',
          'rejected_at',
          'created_at',
          'items',
        ],
        rows.map((r) => [
          r.request_id,
          r.requester,
          r.borrow_date,
          r.return_date,
          r.program_type,
          r.usage_location,
          r.rejected_at,
          r.created_at,
          r.items,
        ]),
      ),
    };
  }

  if (kind === 'staff') {
    const [rows] = await pool.query<
      (RowDataPacket & {
        employee_no: string;
        full_name: string;
        department: string | null;
        email: string | null;
        phone: string | null;
        remarks: string | null;
      })[]
    >(
      `SELECT employee_no, full_name, department, email, phone, remarks FROM staff ORDER BY employee_no`,
    );
    return {
      filename: `nims-staff-directory-${stamp}.csv`,
      contentType: 'text/csv;charset=utf-8',
      body: toCsv(
        ['employee_no', 'full_name', 'department', 'email', 'phone', 'remarks'],
        rows.map((r) => [r.employee_no, r.full_name, r.department, r.email, r.phone, r.remarks]),
      ),
    };
  }

  const table = kind;
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT * FROM \`${table}\` ORDER BY asset_id`,
  );
  if (rows.length === 0) {
    return {
      filename: `nims-${table}-${stamp}.csv`,
      contentType: 'text/csv;charset=utf-8',
      body: '',
    };
  }
  const headers = Object.keys(rows[0]);
  return {
    filename: `nims-${table}-${stamp}.csv`,
    contentType: 'text/csv;charset=utf-8',
    body: toCsv(
      headers,
      rows.map((r) => headers.map((h) => r[h])),
    ),
  };
}
