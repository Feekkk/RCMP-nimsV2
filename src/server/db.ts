import mysql from 'mysql2/promise';
import '@/server/env.server';

let pool: mysql.Pool | null = null;

function mysqlPoolOptions(): mysql.PoolOptions {
  const user = process.env.MYSQL_USER ?? 'root';
  const password = process.env.MYSQL_PASSWORD ?? '';
  const database = process.env.MYSQL_DATABASE ?? 'nimsV2';
  const socketPath = process.env.MYSQL_SOCKET?.trim();

  const base = {
    user,
    password,
    database,
    waitForConnections: true,
    connectionLimit: 10,
  };

  if (socketPath) {
    return { ...base, socketPath };
  }

  const hostRaw = process.env.MYSQL_HOST?.trim() || '127.0.0.1';
  // localhost on Linux often resolves to a Unix socket; use TCP on Plesk instead.
  const host = hostRaw === 'localhost' ? '127.0.0.1' : hostRaw;
  const port = Number(process.env.MYSQL_PORT ?? 3306);

  return {
    ...base,
    host,
    port: Number.isFinite(port) && port > 0 ? port : 3306,
  };
}

export function getDbPool(): mysql.Pool {
  if (!pool) {
    pool = mysql.createPool(mysqlPoolOptions());
  }
  return pool;
}
