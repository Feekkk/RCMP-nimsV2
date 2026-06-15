import type { RowDataPacket } from 'mysql2';
import { ROLE_ADMIN, ROLE_TECHNICIAN, ROLE_USER } from '@/lib/auth-session';
import { getDisplayNameByOid } from '@/server/azure-directory.server';
import { getDbPool } from '@/server/db';

export type AuthUserRow = {
  staffId: string;
  fullName: string;
  email: string;
  roleId: number;
  roleName: string;
  phone: string | null;
};

type UserRow = RowDataPacket & {
  id: number;
  oid: string | null;
  email: string;
  role_id: number;
  phone: string | null;
  role_name: string;
};

export type LoginRole = 'user' | 'staff';

const USER_SELECT = `SELECT u.id, u.oid, u.email, u.role_id, u.phone, r.name AS role_name`;

function displayNameFromEmail(email: string): string {
  const local = email.split('@')[0]?.trim();
  return local || email;
}

function mapUser(row: UserRow, displayName?: string | null): AuthUserRow {
  return {
    staffId: String(row.id),
    fullName: displayName?.trim() || displayNameFromEmail(row.email),
    email: row.email,
    roleId: row.role_id,
    roleName: row.role_name,
    phone: row.phone,
  };
}

/** Resolve full name from Azure by oid, falling back to email local-part. */
async function mapUserWithAzureName(row: UserRow): Promise<AuthUserRow> {
  const displayName = await getDisplayNameByOid(row.oid, row.email);
  return mapUser(row, displayName);
}

async function findUserById(id: number): Promise<UserRow | null> {
  const pool = getDbPool();
  const [rows] = await pool.query<UserRow[]>(
    `${USER_SELECT}
     FROM users u
     INNER JOIN role r ON r.id = u.role_id
     WHERE u.id = ?
     LIMIT 1`,
    [id],
  );
  return rows[0] ?? null;
}

async function findUserByEmail(email: string): Promise<UserRow | null> {
  const pool = getDbPool();
  const [rows] = await pool.query<UserRow[]>(
    `${USER_SELECT}
     FROM users u
     INNER JOIN role r ON r.id = u.role_id
     WHERE u.email = ?
     LIMIT 1`,
    [email.trim().toLowerCase()],
  );
  return rows[0] ?? null;
}

async function findUserByOid(oid: string): Promise<UserRow | null> {
  const pool = getDbPool();
  const [rows] = await pool.query<UserRow[]>(
    `${USER_SELECT}
     FROM users u
     INNER JOIN role r ON r.id = u.role_id
     WHERE u.oid = ?
     LIMIT 1`,
    [oid.trim()],
  );
  return rows[0] ?? null;
}

async function touchMicrosoftLogin(userId: number, oid: string): Promise<void> {
  const pool = getDbPool();
  await pool.execute(
    `UPDATE users SET oid = ?, last_login_at = CURRENT_TIMESTAMP WHERE id = ?`,
    [oid, userId],
  );
}

function assertLoginRole(row: UserRow, loginRole: LoginRole): void {
  if (loginRole === 'staff' && row.role_id === ROLE_USER) {
    throw new Error('This email is registered as a user account. Select User to sign in.');
  }
  if (loginRole === 'user' && row.role_id !== ROLE_USER) {
    throw new Error('This email is registered as staff. Select Staff to sign in.');
  }
}

export type PrepareLoginResult = {
  emailRegistered: boolean;
};

/** Validates email + selected role before redirecting to Microsoft. */
export async function prepareLogin(email: string, loginRole: LoginRole): Promise<PrepareLoginResult> {
  const normalized = email.trim().toLowerCase();
  if (!normalized || !normalized.includes('@')) {
    throw new Error('Enter a valid email address');
  }

  const row = await findUserByEmail(normalized);
  if (row) {
    assertLoginRole(row, loginRole);
    return { emailRegistered: true };
  }

  if (loginRole === 'staff') {
    throw new Error('Your email is not registered. Contact an administrator to be added as staff.');
  }

  return { emailRegistered: false };
}

export type MicrosoftLoginInput = {
  entraOid: string;
  email: string;
};

export type MicrosoftLoginResult = AuthUserRow & {
  accountCreated: boolean;
};

async function createMicrosoftUserAccount(oid: string, email: string): Promise<UserRow> {
  const pool = getDbPool();
  await pool.execute(
    `INSERT INTO users (oid, email, role_id, last_login_at)
     VALUES (?, ?, ?, CURRENT_TIMESTAMP)`,
    [oid, email, ROLE_USER],
  );
  const created = (await findUserByEmail(email)) ?? (await findUserByOid(oid));
  if (!created) throw new Error('Could not create your account');
  return created;
}

/**
 * Sign in via Entra ID. Lookup by email, then oid. New accounts are created as user role only.
 */
export async function loginMicrosoftUser(input: MicrosoftLoginInput): Promise<MicrosoftLoginResult> {
  const email = input.email.trim().toLowerCase();
  const oid = input.entraOid.trim();

  let row = await findUserByEmail(email);
  let accountCreated = false;

  if (!row) {
    row = await findUserByOid(oid);
  }

  if (!row) {
    row = await createMicrosoftUserAccount(oid, email);
    accountCreated = true;
  } else {
    if (row.email !== email) {
      throw new Error(
        'Microsoft email does not match your NIMS account. Contact an administrator to update your email.',
      );
    }
    await touchMicrosoftLogin(row.id, oid);
  }

  const updated = await findUserById(row.id);
  if (!updated) throw new Error('Account not found after sign-in');
  return { ...(await mapUserWithAzureName(updated)), accountCreated };
}

/** Temporary dev sign-in: no password. Auto-creates user role accounts when email is not in DB. */
export async function loginDevByEmail(email: string, loginRole: LoginRole): Promise<AuthUserRow> {
  const normalized = email.trim().toLowerCase();
  if (!normalized || !normalized.includes('@')) {
    throw new Error('Enter a valid email address');
  }

  let row = await findUserByEmail(normalized);
  if (!row) {
    if (loginRole === 'staff') {
      throw new Error('Email not found. Staff accounts must be registered by an administrator.');
    }
    const pool = getDbPool();
    await pool.execute(
      `INSERT INTO users (email, role_id, last_login_at) VALUES (?, ?, CURRENT_TIMESTAMP)`,
      [normalized, ROLE_USER],
    );
    row = await findUserByEmail(normalized);
    if (!row) throw new Error('Could not create your account');
  } else {
    assertLoginRole(row, loginRole);
  }

  const pool = getDbPool();
  await pool.execute(`UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?`, [row.id]);

  const updated = await findUserById(row.id);
  if (!updated) throw new Error('Account not found after sign-in');
  return mapUserWithAzureName(updated);
}

export type UpdateUserProfileInput = {
  staffId: string;
  fullName: string;
  email: string;
  phone: string | null;
  password?: string;
};

function parseUserId(staffId: string): number {
  const id = Number.parseInt(staffId.trim(), 10);
  if (!Number.isFinite(id) || id <= 0) throw new Error('Invalid account id');
  return id;
}

function assertStaffAccount(roleId: number): void {
  if (roleId !== ROLE_TECHNICIAN && roleId !== ROLE_ADMIN) {
    throw new Error('Only technician accounts can access this profile');
  }
}

export async function getStaffProfile(staffId: string): Promise<AuthUserRow> {
  const row = await findUserById(parseUserId(staffId));
  if (!row) throw new Error('Account not found');
  assertStaffAccount(row.role_id);
  return mapUserWithAzureName(row);
}

export async function updateStaffProfile(input: UpdateUserProfileInput): Promise<AuthUserRow> {
  const userId = parseUserId(input.staffId);
  const email = input.email.trim().toLowerCase();
  const phone = input.phone?.trim() || null;

  if (!email) {
    throw new Error('Email is required');
  }

  const row = await findUserById(userId);
  if (!row) throw new Error('Account not found');
  assertStaffAccount(row.role_id);

  const emailOwner = await findUserByEmail(email);
  if (emailOwner && emailOwner.id !== userId) {
    throw new Error('This email is already in use');
  }

  const pool = getDbPool();
  await pool.execute(`UPDATE users SET email = ?, phone = ? WHERE id = ?`, [email, phone, userId]);

  return getStaffProfile(input.staffId);
}

export async function getUserProfile(staffId: string): Promise<AuthUserRow> {
  const row = await findUserById(parseUserId(staffId));
  if (!row) throw new Error('User not found');
  if (row.role_id !== ROLE_USER) {
    throw new Error('Only user accounts can access this profile');
  }
  return mapUserWithAzureName(row);
}

export async function updateUserProfile(input: UpdateUserProfileInput): Promise<AuthUserRow> {
  const userId = parseUserId(input.staffId);
  const email = input.email.trim().toLowerCase();
  const phone = input.phone?.trim() || null;

  if (!email) {
    throw new Error('Email is required');
  }
  if (!phone) {
    throw new Error('Phone number is required');
  }

  const row = await findUserById(userId);
  if (!row) throw new Error('User not found');
  if (row.role_id !== ROLE_USER) {
    throw new Error('Only user accounts can update this profile');
  }

  const emailOwner = await findUserByEmail(email);
  if (emailOwner && emailOwner.id !== userId) {
    throw new Error('This email is already registered');
  }

  const pool = getDbPool();
  await pool.execute(`UPDATE users SET email = ?, phone = ? WHERE id = ?`, [email, phone, userId]);

  return getUserProfile(input.staffId);
}
