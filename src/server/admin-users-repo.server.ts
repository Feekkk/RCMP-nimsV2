import bcrypt from 'bcrypt';
import type { RowDataPacket } from 'mysql2';
import type { AdminUserRow, CreateAdminUserInput, UpdateAdminUserInput } from '@/lib/admin-users-schema';
import { ROLE_ADMIN, ROLE_TECHNICIAN, ROLE_USER } from '@/lib/auth-session';
import { getDbPool } from '@/server/db';

const BCRYPT_ROUNDS = 10;

function formatDateTime(val: Date | string | null | undefined): string | null {
  if (val == null) return null;
  if (val instanceof Date) return val.toISOString().slice(0, 19).replace('T', ' ');
  return String(val).slice(0, 19);
}

function assertValidRoleId(roleId: number): void {
  if (roleId !== ROLE_TECHNICIAN && roleId !== ROLE_ADMIN && roleId !== ROLE_USER) {
    throw new Error('Invalid role');
  }
}

export async function listAdminUsers(): Promise<AdminUserRow[]> {
  const pool = getDbPool();
  const [rows] = await pool.query<
    (RowDataPacket & {
      staff_id: string;
      full_name: string;
      email: string;
      role_id: number;
      role_name: string;
      auth_provider: 'local' | 'microsoft';
      phone: string | null;
      last_login_at: Date | string | null;
      created_at: Date | string;
    })[]
  >(
    `SELECT u.staff_id, u.full_name, u.email, u.role_id, r.name AS role_name,
            u.auth_provider, u.phone, u.last_login_at, u.created_at
     FROM users u
     INNER JOIN role r ON r.id = u.role_id
     ORDER BY u.created_at DESC`,
  );
  return rows.map((r) => ({
    staffId: r.staff_id,
    fullName: r.full_name,
    email: r.email,
    roleId: r.role_id,
    roleName: r.role_name,
    authProvider: r.auth_provider,
    phone: r.phone,
    lastLoginAt: formatDateTime(r.last_login_at),
    createdAt: formatDateTime(r.created_at) ?? '',
  }));
}

export async function createAdminUser(input: CreateAdminUserInput): Promise<AdminUserRow> {
  const staffId = input.staffId.trim();
  const fullName = input.fullName.trim();
  const email = input.email.trim().toLowerCase();
  const phone = input.phone?.trim() || null;
  assertValidRoleId(input.roleId);

  if (!staffId || !fullName || !email) {
    throw new Error('Staff ID, name, and email are required');
  }

  const pool = getDbPool();
  const [existing] = await pool.query<RowDataPacket[]>(
    `SELECT staff_id FROM users WHERE staff_id = ? OR email = ? LIMIT 1`,
    [staffId, email],
  );
  if (existing.length > 0) {
    throw new Error('Staff ID or email already exists');
  }

  let passwordHash: string | null = null;
  if (input.password && input.password.length > 0) {
    if (input.password.length < 6) throw new Error('Password must be at least 6 characters');
    passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
  } else if (input.roleId === ROLE_USER) {
    throw new Error('Password is required for local user accounts');
  }

  await pool.execute(
    `INSERT INTO users (staff_id, full_name, email, password_hash, auth_provider, role_id, phone)
     VALUES (?, ?, ?, ?, 'local', ?, ?)`,
    [staffId, fullName, email, passwordHash, input.roleId, phone],
  );

  const users = await listAdminUsers();
  const created = users.find((u) => u.staffId === staffId);
  if (!created) throw new Error('User creation failed');
  return created;
}

export async function updateAdminUser(input: UpdateAdminUserInput): Promise<AdminUserRow> {
  const staffId = input.staffId.trim();
  const fullName = input.fullName.trim();
  const email = input.email.trim().toLowerCase();
  const phone = input.phone?.trim() || null;
  assertValidRoleId(input.roleId);

  if (!fullName || !email) throw new Error('Name and email are required');

  const pool = getDbPool();
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT staff_id FROM users WHERE staff_id = ? LIMIT 1`,
    [staffId],
  );
  if (rows.length === 0) throw new Error('User not found');

  const [emailOwner] = await pool.query<RowDataPacket[]>(
    `SELECT staff_id FROM users WHERE email = ? AND staff_id <> ? LIMIT 1`,
    [email, staffId],
  );
  if (emailOwner.length > 0) throw new Error('Email already in use');

  if (input.password != null && input.password.length > 0) {
    if (input.password.length < 6) throw new Error('Password must be at least 6 characters');
    const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
    await pool.execute(
      `UPDATE users SET full_name = ?, email = ?, role_id = ?, phone = ?, password_hash = ? WHERE staff_id = ?`,
      [fullName, email, input.roleId, phone, passwordHash, staffId],
    );
  } else {
    await pool.execute(
      `UPDATE users SET full_name = ?, email = ?, role_id = ?, phone = ? WHERE staff_id = ?`,
      [fullName, email, input.roleId, phone, staffId],
    );
  }

  const users = await listAdminUsers();
  const updated = users.find((u) => u.staffId === staffId);
  if (!updated) throw new Error('User update failed');
  return updated;
}
