import type { RowDataPacket } from 'mysql2';
import type { AssetKind } from '@/lib/inventory-schema';
import { STATUS_ID } from '@/lib/asset-status-actions';
import type {
  DeployLaptopPlaceInput,
  DeployLaptopStaffInput,
  DeployPlaceInput,
  LaptopHandoverOpen,
  LaptopPlaceOpen,
  OpenReturnContext,
  PlaceDeploymentOpen,
  ReturnLaptopPlaceInput,
  ReturnLaptopStaffInput,
  ReturnPlaceInput,
  StaffRecipient,
} from '@/lib/deploy-return-schema';
import { getReturnStatusIdForCondition } from '@/lib/deploy-return-schema';
import { attachDisplayNames } from '@/server/azure-directory.server';
import { getDbPool } from '@/server/db';

const ASSET_TABLE: Record<AssetKind, string> = {
  laptop: 'laptop',
  av: 'av',
  network: 'network',
};

export async function searchStaffRecipients(query: string): Promise<StaffRecipient[]> {
  const pool = getDbPool();
  const q = `%${query.trim()}%`;
  if (!query.trim()) return [];
  const [rows] = await pool.query<
    (RowDataPacket & {
      employee_no: string;
      full_name: string;
      department: string | null;
      email: string | null;
      phone: string | null;
    })[]
  >(
    `SELECT employee_no, full_name, department, email, phone
     FROM staff
     WHERE full_name LIKE ? OR employee_no LIKE ?
     ORDER BY full_name
     LIMIT 25`,
    [q, q],
  );
  return rows.map((r) => ({
    employeeNo: r.employee_no,
    fullName: r.full_name,
    department: r.department,
    email: r.email,
    phone: r.phone,
  }));
}

export async function getOpenReturnContext(
  kind: AssetKind,
  assetId: number,
): Promise<OpenReturnContext | null> {
  const pool = getDbPool();

  if (kind === 'laptop') {
    const [staffRows] = await pool.query<
      (RowDataPacket & {
        handover_id: number;
        handover_staff_id: number;
        handover_date: Date | string;
        handover_remarks: string | null;
        employee_no: string;
        full_name: string;
        department: string | null;
        technician_oid: string | null;
        technician_name: string;
      })[]
    >(
      `SELECT h.handover_id, hs.handover_staff_id, h.handover_date, h.handover_remarks,
              hs.employee_no, s.full_name, s.department, tech.oid AS technician_oid
       FROM handover h
       INNER JOIN handover_staff hs ON hs.handover_id = h.handover_id
       INNER JOIN staff s ON s.employee_no = hs.employee_no
       INNER JOIN users tech ON tech.id = h.user_id
       LEFT JOIN handover_return hr ON hr.handover_staff_id = hs.handover_staff_id
       WHERE h.asset_id = ? AND hr.return_id IS NULL
       ORDER BY h.handover_id DESC
       LIMIT 1`,
      [assetId],
    );
    await attachDisplayNames(staffRows, 'technician_oid', 'technician_name');
    if (staffRows[0]) {
      const r = staffRows[0];
      const record: LaptopHandoverOpen = {
        type: 'staff',
        handoverId: r.handover_id,
        handoverStaffId: r.handover_staff_id,
        handoverDate: formatDateOnly(r.handover_date),
        handoverRemarks: r.handover_remarks,
        employeeNo: r.employee_no,
        recipientName: r.full_name,
        department: r.department,
        handledBy: r.technician_name?.trim() || null,
      };
      return { kind: 'laptop', record };
    }

    const [placeRows] = await pool.query<
      (RowDataPacket & {
        handover_id: number;
        handover_date: Date | string;
        handover_remarks: string | null;
        technician_oid: string | null;
        technician_name: string;
      })[]
    >(
      `SELECT h.handover_id, h.handover_date, h.handover_remarks, tech.oid AS technician_oid
       FROM handover h
       INNER JOIN users tech ON tech.id = h.user_id
       LEFT JOIN handover_staff hs ON hs.handover_id = h.handover_id
       LEFT JOIN handover_return hr ON hr.handover_id = h.handover_id
       WHERE h.asset_id = ? AND hs.handover_staff_id IS NULL AND hr.return_id IS NULL
       ORDER BY h.handover_id DESC
       LIMIT 1`,
      [assetId],
    );
    await attachDisplayNames(placeRows, 'technician_oid', 'technician_name');
    if (placeRows[0]) {
      const r = placeRows[0];
      const record: LaptopPlaceOpen = {
        type: 'place',
        handoverId: r.handover_id,
        handoverDate: formatDateOnly(r.handover_date),
        handoverRemarks: r.handover_remarks,
        handledBy: r.technician_name?.trim() || null,
      };
      return { kind: 'laptop', record };
    }
    return null;
  }

  const deployTable = kind === 'av' ? 'av_deployment' : 'network_deployment';
  const returnTable = kind === 'av' ? 'av_return' : 'network_return';

  const [rows] = await pool.query<
    (RowDataPacket & {
      deployment_id: number;
      building: string;
      level: string;
      zone: string;
      deployment_date: Date | string;
      deployment_remarks: string | null;
      technician_oid: string | null;
      technician_name: string;
    })[]
  >(
    `SELECT d.deployment_id, d.building, d.level, d.zone, d.deployment_date, d.deployment_remarks,
            u.oid AS technician_oid
     FROM \`${deployTable}\` d
     INNER JOIN users u ON u.id = d.user_id
     WHERE d.asset_id = ?
       AND NOT EXISTS (
         SELECT 1 FROM \`${returnTable}\` r WHERE r.deployment_id = d.deployment_id
       )
     ORDER BY d.deployment_id DESC
     LIMIT 1`,
    [assetId],
  );
  await attachDisplayNames(rows, 'technician_oid', 'technician_name');

  if (!rows[0]) return null;

  const r = rows[0];
  const record: PlaceDeploymentOpen = {
    deploymentId: r.deployment_id,
    building: r.building,
    level: r.level,
    zone: r.zone,
    deploymentDate: formatDateOnly(r.deployment_date),
    deploymentRemarks: r.deployment_remarks,
    handledBy: r.technician_name?.trim() || null,
  };
  return { kind, record };
}

function formatDateOnly(val: Date | string): string {
  if (val instanceof Date) return val.toISOString().slice(0, 10);
  return String(val).slice(0, 10);
}

export async function deployLaptopToStaff(input: DeployLaptopStaffInput) {
  const pool = getDbPool();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [handoverResult] = await conn.execute(
      `INSERT INTO handover (asset_id, user_id, handover_date, handover_remarks, handled_by_name)
       VALUES (?, ?, ?, ?, ?)`,
      [input.assetId, input.staffId, input.handoverDate, input.handoverRemarks ?? null, input.handledByName],
    );
    const handoverId = (handoverResult as { insertId: number }).insertId;
    await conn.execute(
      `INSERT INTO handover_staff (employee_no, handover_id) VALUES (?, ?)`,
      [input.employeeNo, handoverId],
    );
    await conn.execute(`UPDATE laptop SET status_id = ? WHERE asset_id = ?`, [
      STATUS_ID.DEPLOY,
      input.assetId,
    ]);
    await conn.commit();
    return { handoverId };
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

export async function deployLaptopToPlace(input: DeployLaptopPlaceInput) {
  const pool = getDbPool();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [handoverResult] = await conn.execute(
      `INSERT INTO handover (asset_id, user_id, handover_date, handover_remarks, handled_by_name)
       VALUES (?, ?, ?, ?, ?)`,
      [input.assetId, input.staffId, input.handoverDate, input.handoverRemarks ?? null, input.handledByName],
    );
    const handoverId = (handoverResult as { insertId: number }).insertId;
    await conn.execute(`UPDATE laptop SET status_id = ? WHERE asset_id = ?`, [
      STATUS_ID.DEPLOY,
      input.assetId,
    ]);
    await conn.commit();
    return { handoverId };
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

export async function deployToPlace(input: DeployPlaceInput) {
  const pool = getDbPool();
  const table = input.kind === 'av' ? 'av_deployment' : 'network_deployment';
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [result] = await conn.execute(
      `INSERT INTO \`${table}\`
        (asset_id, building, level, zone, deployment_date, deployment_remarks, user_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        input.assetId,
        input.building,
        input.level,
        input.zone,
        input.deploymentDate,
        input.deploymentRemarks ?? null,
        input.staffId,
      ],
    );
    const deploymentId = (result as { insertId: number }).insertId;
    await conn.execute(`UPDATE \`${ASSET_TABLE[input.kind]}\` SET status_id = ? WHERE asset_id = ?`, [
      STATUS_ID.DEPLOY,
      input.assetId,
    ]);
    await conn.commit();
    return { deploymentId };
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

export async function returnLaptopStaff(input: ReturnLaptopStaffInput) {
  const pool = getDbPool();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [hsRows] = await pool.query<
      (RowDataPacket & { handover_id: number; asset_id: number })[]
    >(
      `SELECT h.handover_id, h.asset_id
       FROM handover_staff hs
       INNER JOIN handover h ON h.handover_id = hs.handover_id
       WHERE hs.handover_staff_id = ?`,
      [input.handoverStaffId],
    );
    const row = hsRows[0];
    if (!row) {
      throw new Error('This handover record could not be found. Refresh the page and try again.');
    }

    const statusId = getReturnStatusIdForCondition(input.condition);

    const [insertResult] = await conn.execute(
      `INSERT INTO handover_return
        (handover_staff_id, returned_by, return_date, return_time, return_place, \`condition\`, return_remarks, return_status_id, returned_by_name)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        input.handoverStaffId,
        input.returnedBy,
        input.returnDate,
        input.returnTime ?? null,
        input.returnPlace ?? null,
        input.condition ?? null,
        input.returnRemarks ?? null,
        statusId,
        input.returnedByName,
      ],
    );
    await conn.execute(`UPDATE laptop SET status_id = ? WHERE asset_id = ?`, [
      statusId,
      row.asset_id,
    ]);
    await conn.commit();
    return {
      assetId: row.asset_id,
      returnId: (insertResult as { insertId: number }).insertId,
    };
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

export async function returnLaptopPlace(input: ReturnLaptopPlaceInput) {
  const pool = getDbPool();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [hRows] = await pool.query<(RowDataPacket & { asset_id: number })[]>(
      `SELECT asset_id FROM handover WHERE handover_id = ?`,
      [input.handoverId],
    );
    const row = hRows[0];
    if (!row) {
      throw new Error('This handover record could not be found. Refresh the page and try again.');
    }

    const statusId = getReturnStatusIdForCondition(input.condition);

    const [insertResult] = await conn.execute(
      `INSERT INTO handover_return
        (handover_id, returned_by, return_date, return_time, return_place, \`condition\`, return_remarks, return_status_id, returned_by_name)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        input.handoverId,
        input.returnedBy,
        input.returnDate,
        input.returnTime ?? null,
        input.returnPlace ?? null,
        input.condition ?? null,
        input.returnRemarks ?? null,
        statusId,
        input.returnedByName,
      ],
    );
    await conn.execute(`UPDATE laptop SET status_id = ? WHERE asset_id = ?`, [
      statusId,
      row.asset_id,
    ]);
    await conn.commit();
    return {
      assetId: row.asset_id,
      returnId: (insertResult as { insertId: number }).insertId,
    };
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

export async function returnPlaceAsset(input: ReturnPlaceInput) {
  const pool = getDbPool();
  const returnTable = input.kind === 'av' ? 'av_return' : 'network_return';
  const deployTable = input.kind === 'av' ? 'av_deployment' : 'network_deployment';
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [dRows] = await pool.query<(RowDataPacket & { asset_id: number })[]>(
      `SELECT asset_id FROM \`${deployTable}\` WHERE deployment_id = ?`,
      [input.deploymentId],
    );
    const row = dRows[0];
    if (!row) {
      throw new Error('This deployment record could not be found. Refresh the page and try again.');
    }

    const statusId = getReturnStatusIdForCondition(input.condition);

    await conn.execute(
      `INSERT INTO \`${returnTable}\`
        (deployment_id, returned_by, return_date, return_time, return_place, \`condition\`, return_remarks)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        input.deploymentId,
        input.returnedBy,
        input.returnDate,
        input.returnTime ?? null,
        input.returnPlace ?? null,
        input.condition ?? null,
        input.returnRemarks ?? null,
      ],
    );
    await conn.execute(`UPDATE \`${ASSET_TABLE[input.kind]}\` SET status_id = ? WHERE asset_id = ?`, [
      statusId,
      row.asset_id,
    ]);
    await conn.commit();
    return { assetId: row.asset_id };
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}
