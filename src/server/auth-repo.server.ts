import bcrypt from 'bcrypt';
import type { RowDataPacket } from 'mysql2';
import { ROLE_ADMIN, ROLE_TECHNICIAN, ROLE_USER } from '@/lib/auth-session';
import { getDbPool } from '@/server/db';

const BCRYPT_ROUNDS = 10;

export type AuthUserRow = {
  staffId: string;
  fullName: string;
  email: string;
  roleId: number;
  roleName: string;
  phone: string | null;
};

type UserRow = RowDataPacket & {
  staff_id: string;
  full_name: string;
  email: string;
  entra_oid: string | null;
  password_hash: string | null;
  auth_provider: 'local' | 'microsoft';
  role_id: number;
  phone: string | null;
  role_name: string;
};

const USER_SELECT = `SELECT u.staff_id, u.full_name, u.email, u.entra_oid, u.password_hash, u.auth_provider,
  u.role_id, u.phone, r.name AS role_name`;

function mapUser(row: UserRow): AuthUserRow {
  return {
    staffId: row.staff_id,
    fullName: row.full_name,
    email: row.email,
    roleId: row.role_id,
    roleName: row.role_name,
    phone: row.phone,
  };
}

async function findUserByStaffId(staffId: string): Promise<UserRow | null> {
  const pool = getDbPool();
  const [rows] = await pool.query<UserRow[]>(
    `${USER_SELECT}
     FROM users u
     INNER JOIN role r ON r.id = u.role_id
     WHERE u.staff_id = ?
     LIMIT 1`,
    [staffId.trim()],
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

async function findUserByEntraOid(entraOid: string): Promise<UserRow | null> {
  const pool = getDbPool();
  const [rows] = await pool.query<UserRow[]>(
    `${USER_SELECT}
     FROM users u
     INNER JOIN role r ON r.id = u.role_id
     WHERE u.entra_oid = ?
     LIMIT 1`,
    [entraOid.trim()],
  );
  return rows[0] ?? null;
}

async function touchMicrosoftLogin(staffId: string, entraOid: string, fullName: string): Promise<void> {
  const pool = getDbPool();
  await pool.execute(
    `UPDATE users
     SET entra_oid = ?, auth_provider = 'microsoft', full_name = ?, last_login_at = CURRENT_TIMESTAMP
     WHERE staff_id = ?`,
    [entraOid, fullName, staffId],
  );
}

export type MicrosoftLoginInput = {
  entraOid: string;
  email: string;
  fullName: string;
};

export type MicrosoftLoginResult = AuthUserRow & {
  /** True when a new role=user account was created on this sign-in. */
  accountCreated: boolean;
};

/** Stable staff_id for SSO-only borrowers (role 3), derived from Entra object id. */
function staffIdFromEntraOid(entraOid: string): string {
  const compact = entraOid.replace(/-/g, '').toLowerCase();
  return `U${compact}`.slice(0, 32);
}

async function createMicrosoftBorrowerAccount(
  entraOid: string,
  email: string,
  fullName: string,
): Promise<UserRow> {
  const staffId = staffIdFromEntraOid(entraOid);
  const pool = getDbPool();
  await pool.execute(
    `INSERT INTO users (staff_id, full_name, email, entra_oid, password_hash, auth_provider, role_id, last_login_at)
     VALUES (?, ?, ?, ?, NULL, 'microsoft', ?, CURRENT_TIMESTAMP)`,
    [staffId, fullName, email, entraOid, ROLE_USER],
  );
  const created = await findUserByStaffId(staffId);
  if (!created) throw new Error('Could not create your account');
  return created;
}

/**
 * Sign in via Entra ID.
 * - role 3 (user): auto-created on first sign-in; returning users matched by entra_oid or email.
 * - role 1/2 (staff/admin): must be provisioned in users first; role_id comes from the database.
 */
export async function loginMicrosoftUser(input: MicrosoftLoginInput): Promise<MicrosoftLoginResult> {
  const email = input.email.trim().toLowerCase();
  const entraOid = input.entraOid.trim();
  const fullName = input.fullName.trim() || email.split('@')[0];

  let row = await findUserByEntraOid(entraOid);
  if (!row) {
    row = await findUserByEmail(email);
  }

  let accountCreated = false;

  if (!row) {
    row = await createMicrosoftBorrowerAccount(entraOid, email, fullName);
    accountCreated = true;
  } else {
    if (row.email !== email) {
      throw new Error(
        'Microsoft email does not match your NIMS account. Contact an administrator to update your email.',
      );
    }
    await touchMicrosoftLogin(row.staff_id, entraOid, fullName);
  }

  const updated = await findUserByStaffId(row.staff_id);
  if (!updated) throw new Error('Account not found after sign-in');
  return { ...mapUser(updated), accountCreated };
}

export async function loginStaff(staffId: string, password: string): Promise<AuthUserRow> {
  const row = await findUserByStaffId(staffId);
  if (!row) {
    throw new Error('Invalid staff ID or password');
  }
  if (row.role_id !== 1 && row.role_id !== 2) {
    throw new Error('This account cannot sign in as staff');
  }
  if (!row.password_hash) {
    throw new Error('This account uses Microsoft sign-in. Use Continue with Microsoft.');
  }
  const ok = await bcrypt.compare(password, row.password_hash);
  if (!ok) {
    throw new Error('Invalid staff ID or password');
  }
  return mapUser(row);
}

export async function loginUser(email: string, password: string): Promise<AuthUserRow> {
  const row = await findUserByEmail(email);
  if (!row) {
    throw new Error('Invalid email or password');
  }
  if (row.role_id !== ROLE_USER) {
    throw new Error('This account cannot sign in here. Use staff sign-in.');
  }
  if (!row.password_hash) {
    throw new Error('This account uses Microsoft sign-in. Use Continue with Microsoft.');
  }
  const ok = await bcrypt.compare(password, row.password_hash);
  if (!ok) {
    throw new Error('Invalid email or password');
  }
  return mapUser(row);
}

export type RegisterUserInput = {
  staffId: string;
  fullName: string;
  email: string;
  password: string;
  phone?: string | null;
};

export async function registerUser(input: RegisterUserInput): Promise<AuthUserRow> {
  const staffId = input.staffId.trim();
  const fullName = input.fullName.trim();
  const email = input.email.trim().toLowerCase();
  const phone = input.phone?.trim() || null;

  if (!staffId || !fullName || !email || !input.password) {
    throw new Error('All required fields must be filled');
  }
  if (input.password.length < 6) {
    throw new Error('Password must be at least 6 characters');
  }

  const existingId = await findUserByStaffId(staffId);
  if (existingId) {
    throw new Error('This user ID is already registered');
  }

  const existingEmail = await findUserByEmail(email);
  if (existingEmail) {
    throw new Error('This email is already registered');
  }

  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
  const pool = getDbPool();

  await pool.execute(
    `INSERT INTO users (staff_id, full_name, email, password_hash, auth_provider, role_id, phone)
     VALUES (?, ?, ?, ?, 'local', ?, ?)`,
    [staffId, fullName, email, passwordHash, ROLE_USER, phone],
  );

  const created = await findUserByStaffId(staffId);
  if (!created) {
    throw new Error('Registration failed');
  }
  return mapUser(created);
}

export type UpdateUserProfileInput = {
  staffId: string;
  fullName: string;
  email: string;
  phone: string | null;
  password?: string;
};

function assertStaffAccount(roleId: number): void {
  if (roleId !== ROLE_TECHNICIAN && roleId !== ROLE_ADMIN) {
    throw new Error('Only technician accounts can access this profile');
  }
}

export async function getStaffProfile(staffId: string): Promise<AuthUserRow> {
  const row = await findUserByStaffId(staffId);
  if (!row) throw new Error('Account not found');
  assertStaffAccount(row.role_id);
  return mapUser(row);
}

export async function updateStaffProfile(input: UpdateUserProfileInput): Promise<AuthUserRow> {
  const staffId = input.staffId.trim();
  const fullName = input.fullName.trim();
  const email = input.email.trim().toLowerCase();
  const phone = input.phone?.trim() || null;

  if (!fullName || !email) {
    throw new Error('Name and email are required');
  }

  const row = await findUserByStaffId(staffId);
  if (!row) throw new Error('Account not found');
  assertStaffAccount(row.role_id);

  if (input.password != null && input.password.length > 0 && input.password.length < 6) {
    throw new Error('Password must be at least 6 characters');
  }

  const emailOwner = await findUserByEmail(email);
  if (emailOwner && emailOwner.staff_id !== staffId) {
    throw new Error('This email is already in use');
  }

  const pool = getDbPool();
  if (input.password != null && input.password.length > 0) {
    const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
    await pool.execute(
      `UPDATE users SET full_name = ?, email = ?, phone = ?, password_hash = ? WHERE staff_id = ?`,
      [fullName, email, phone, passwordHash, staffId],
    );
  } else {
    await pool.execute(`UPDATE users SET full_name = ?, email = ?, phone = ? WHERE staff_id = ?`, [
      fullName,
      email,
      phone,
      staffId,
    ]);
  }

  return getStaffProfile(staffId);
}

export async function getUserProfile(staffId: string): Promise<AuthUserRow> {
  const row = await findUserByStaffId(staffId);
  if (!row) throw new Error('User not found');
  if (row.role_id !== ROLE_USER) {
    throw new Error('Only user accounts can access this profile');
  }
  return mapUser(row);
}

export async function updateUserProfile(input: UpdateUserProfileInput): Promise<AuthUserRow> {
  const staffId = input.staffId.trim();
  const fullName = input.fullName.trim();
  const email = input.email.trim().toLowerCase();
  const phone = input.phone?.trim() || null;

  if (!fullName || !email) {
    throw new Error('Name and email are required');
  }

  const row = await findUserByStaffId(staffId);
  if (!row) throw new Error('User not found');
  if (row.role_id !== ROLE_USER) {
    throw new Error('Only user accounts can update this profile');
  }

  if (input.password != null && input.password.length > 0 && input.password.length < 6) {
    throw new Error('Password must be at least 6 characters');
  }

  const emailOwner = await findUserByEmail(email);
  if (emailOwner && emailOwner.staff_id !== staffId) {
    throw new Error('This email is already registered');
  }

  const pool = getDbPool();
  if (input.password != null && input.password.length > 0) {
    const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
    await pool.execute(
      `UPDATE users SET full_name = ?, email = ?, phone = ?, password_hash = ? WHERE staff_id = ?`,
      [fullName, email, phone, passwordHash, staffId],
    );
  } else {
    await pool.execute(`UPDATE users SET full_name = ?, email = ?, phone = ? WHERE staff_id = ?`, [
      fullName,
      email,
      phone,
      staffId,
    ]);
  }

  return getUserProfile(staffId);
}
