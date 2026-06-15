import type { RowDataPacket } from 'mysql2';
import type { AdminUserRow, CreateAdminUserInput, UpdateAdminUserInput } from '@/lib/admin-users-schema';
import { ROLE_ADMIN, ROLE_TECHNICIAN, ROLE_USER } from '@/lib/auth-session';
import { getDirectoryUserByEmail, getDisplayNamesByOids } from '@/server/azure-directory.server';
import { getDbPool } from '@/server/db';

type AdminUserDbRow = RowDataPacket & {
  id: number;
  oid: string | null;
  email: string;
  role_id: number;
  role_name: string;
  phone: string | null;
  last_login_at: Date | string | null;
  created_at: Date | string;
};

function formatDateTime(val: Date | string | null | undefined): string | null {
  if (val == null) return null;
  if (val instanceof Date) return val.toISOString().slice(0, 19).replace('T', ' ');
  return String(val).slice(0, 19);
}

function emailLocalPart(email: string): string {
  const local = email.split('@')[0]?.trim();
  return local || email;
}

function assertValidRoleId(roleId: number): void {
  if (roleId !== ROLE_TECHNICIAN && roleId !== ROLE_ADMIN && roleId !== ROLE_USER) {
    throw new Error('Invalid role');
  }
}

function parseUserId(staffId: string): number {
  const id = Number.parseInt(staffId.trim(), 10);
  if (!Number.isFinite(id) || id <= 0) throw new Error('Invalid account id');
  return id;
}

export async function listAdminUsers(): Promise<AdminUserRow[]> {
  const pool = getDbPool();
  const [rows] = await pool.query<AdminUserDbRow[]>(
    `SELECT u.id, u.oid, u.email, u.role_id, r.name AS role_name,
            u.phone, u.last_login_at, u.created_at
     FROM users u
     INNER JOIN role r ON r.id = u.role_id
     ORDER BY u.created_at DESC`,
  );

  const fallback = new Map<string, string>();
  for (const r of rows) {
    if (r.oid) fallback.set(r.oid, emailLocalPart(r.email));
  }
  const names = await getDisplayNamesByOids(
    rows.map((r) => r.oid),
    fallback,
  );

  return rows.map((r) => ({
    staffId: String(r.id),
    fullName: (r.oid ? names.get(r.oid) : null) || emailLocalPart(r.email),
    email: r.email,
    roleId: r.role_id,
    roleName: r.role_name,
    phone: r.phone,
    lastLoginAt: formatDateTime(r.last_login_at),
    createdAt: formatDateTime(r.created_at) ?? '',
  }));
}

export async function createAdminUser(input: CreateAdminUserInput): Promise<AdminUserRow> {
  const email = input.email.trim().toLowerCase();
  const phone = input.phone?.trim() || null;
  assertValidRoleId(input.roleId);

  if (!email || !email.includes('@')) {
    throw new Error('A valid email is required');
  }

  const pool = getDbPool();
  const [existing] = await pool.query<RowDataPacket[]>(
    `SELECT id FROM users WHERE email = ? LIMIT 1`,
    [email],
  );
  if (existing.length > 0) {
    throw new Error('Email already exists');
  }

  // Bind the Azure oid now if the directory user already exists; otherwise it is set on first sign-in.
  const directoryUser = await getDirectoryUserByEmail(email);

  const [result] = await pool.execute(
    `INSERT INTO users (oid, email, role_id, phone) VALUES (?, ?, ?, ?)`,
    [directoryUser?.oid ?? null, email, input.roleId, phone],
  );
  const insertId = (result as { insertId: number }).insertId;

  const users = await listAdminUsers();
  const created = users.find((u) => u.staffId === String(insertId));
  if (!created) throw new Error('User creation failed');
  return created;
}

export async function updateAdminUser(input: UpdateAdminUserInput): Promise<AdminUserRow> {
  const userId = parseUserId(input.staffId);
  const email = input.email.trim().toLowerCase();
  const phone = input.phone?.trim() || null;
  assertValidRoleId(input.roleId);

  if (!email || !email.includes('@')) throw new Error('A valid email is required');

  const pool = getDbPool();
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT id FROM users WHERE id = ? LIMIT 1`,
    [userId],
  );
  if (rows.length === 0) throw new Error('User not found');

  const [emailOwner] = await pool.query<RowDataPacket[]>(
    `SELECT id FROM users WHERE email = ? AND id <> ? LIMIT 1`,
    [email, userId],
  );
  if (emailOwner.length > 0) throw new Error('Email already in use');

  await pool.execute(
    `UPDATE users SET email = ?, role_id = ?, phone = ? WHERE id = ?`,
    [email, input.roleId, phone, userId],
  );

  const users = await listAdminUsers();
  const updated = users.find((u) => u.staffId === String(userId));
  if (!updated) throw new Error('User update failed');
  return updated;
}
