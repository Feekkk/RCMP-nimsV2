import type { RowDataPacket } from 'mysql2';
import { ROLE_USER } from '@/lib/auth-session';
import { LOGIN_MAINTENANCE_MESSAGE } from '@/lib/system-settings';
import { getDbPool } from '@/server/db';

export { LOGIN_MAINTENANCE_MESSAGE };

const LOGIN_MAINTENANCE_KEY = 'login_maintenance';

type SettingRow = RowDataPacket & { value: string | null };

export async function ensureSystemSettingsTable(): Promise<void> {
  const pool = getDbPool();
  await pool.execute(
    `CREATE TABLE IF NOT EXISTS system_settings (
      setting_key VARCHAR(64) NOT NULL PRIMARY KEY,
      value VARCHAR(255) NOT NULL,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  );
}

export async function isLoginMaintenanceEnabled(): Promise<boolean> {
  await ensureSystemSettingsTable();
  const pool = getDbPool();
  const [rows] = await pool.query<SettingRow[]>(
    `SELECT value FROM system_settings WHERE setting_key = ? LIMIT 1`,
    [LOGIN_MAINTENANCE_KEY],
  );
  return rows[0]?.value === '1';
}

export async function setLoginMaintenanceEnabled(enabled: boolean): Promise<void> {
  await ensureSystemSettingsTable();
  const pool = getDbPool();
  await pool.execute(
    `INSERT INTO system_settings (setting_key, value)
     VALUES (?, ?)
     ON DUPLICATE KEY UPDATE value = VALUES(value)`,
    [LOGIN_MAINTENANCE_KEY, enabled ? '1' : '0'],
  );
}

/** Blocks sign-in for role 3 (user) when maintenance mode is on. Staff and admins may still sign in. */
export async function assertUserRoleLoginAllowed(roleId: number): Promise<void> {
  if (roleId === ROLE_USER && (await isLoginMaintenanceEnabled())) {
    throw new Error(LOGIN_MAINTENANCE_MESSAGE);
  }
}
