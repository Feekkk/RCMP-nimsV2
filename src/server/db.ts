import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import type { Pool, PoolConnection, PoolOptions } from 'mysql2/promise';
import '@/server/env.server';

type MysqlPromise = typeof import('mysql2/promise');

let pool: Pool | null = null;
let mysqlModule: MysqlPromise | null = null;

function resolveProjectRoot(): string {
  const candidates = [
    process.cwd(),
    resolve(process.cwd(), '..'),
    resolve(process.cwd(), '../..'),
    resolve(process.cwd(), '../../..'),
  ];

  for (const root of candidates) {
    if (existsSync(resolve(root, 'node_modules/mysql2/package.json'))) {
      return root;
    }
  }

  return process.cwd();
}

/** Load mysql2 from app node_modules at runtime (not from Nitro bundle). */
function loadMysql(): MysqlPromise {
  if (mysqlModule) return mysqlModule;

  const root = resolveProjectRoot();
  const require = createRequire(resolve(root, 'package.json'));
  mysqlModule = require('mysql2/promise') as MysqlPromise;
  return mysqlModule;
}

function mysqlPoolOptions(): PoolOptions {
  const user = process.env.MYSQL_USER ?? 'root';
  const password = process.env.MYSQL_PASSWORD ?? '';
  const database = process.env.MYSQL_DATABASE ?? 'nimsV2';

  const base: PoolOptions = {
    user,
    password,
    database,
    waitForConnections: true,
    connectionLimit: 10,
    connectTimeout: 10_000,
    enableKeepAlive: true,
  };

  const socketPath = process.env.MYSQL_SOCKET?.trim();
  if (socketPath) {
    return { ...base, socketPath };
  }

  const hostRaw = process.env.MYSQL_HOST?.trim() || '127.0.0.1';
  const host = hostRaw === 'localhost' ? '127.0.0.1' : hostRaw;
  const port = Number(process.env.MYSQL_PORT ?? 3306);

  return {
    ...base,
    host,
    port: Number.isFinite(port) && port > 0 ? port : 3306,
  };
}

export function getDbPool(): Pool {
  if (!pool) {
    const mysql = loadMysql();
    const databaseUrl = process.env.DATABASE_URL?.trim();
    pool = databaseUrl
      ? mysql.createPool(databaseUrl)
      : mysql.createPool(mysqlPoolOptions());
  }
  return pool;
}

export type { PoolConnection };

export function formatDatabaseError(error: unknown): string {
  if (!(error instanceof Error)) {
    return 'The database could not be reached. Try again later or contact support.';
  }

  const details = error as Error & { code?: string; syscall?: string };

  if (details.message.includes('EEXIST')) {
    return 'The database connection settings are incorrect. Contact your administrator to review the database configuration.';
  }
  if (details.code === 'ECONNREFUSED' || details.message.includes('ECONNREFUSED')) {
    return 'The database server is not responding. It may be offline — try again later or contact support.';
  }
  if (details.code === 'ER_ACCESS_DENIED_ERROR') {
    return 'The database login details are incorrect. Contact your administrator to verify the database credentials.';
  }
  if (details.code === 'ERR_MODULE_NOT_FOUND' || details.message.includes('mysql2')) {
    return 'The database driver is missing on the server. Contact your administrator to complete the server setup.';
  }

  return 'The database could not be reached. Try again later or contact support.';
}

export function resetDbPoolForTests(): void {
  pool = null;
  mysqlModule = null;
}
