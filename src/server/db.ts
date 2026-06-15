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
  if (!(error instanceof Error)) return 'Connection failed';

  const details = error as Error & { code?: string; syscall?: string };
  const parts = [details.message];

  if (details.code) parts.push(`code=${details.code}`);
  if (details.syscall) parts.push(`syscall=${details.syscall}`);

  if (details.message.includes('EEXIST')) {
    parts.push(
      'hint=set DATABASE_URL or MYSQL_HOST=127.0.0.1; remove invalid MYSQL_SOCKET; run npm install on server',
    );
  } else if (details.code === 'ECONNREFUSED' || details.message.includes('ECONNREFUSED')) {
    parts.push('hint=use DATABASE_URL=mysql://user:pass@127.0.0.1:3306/dbname');
  } else if (details.code === 'ER_ACCESS_DENIED_ERROR') {
    parts.push('hint=check DB user/password from Plesk Databases panel');
  } else if (details.code === 'ERR_MODULE_NOT_FOUND' || details.message.includes('mysql2')) {
    parts.push('hint=run npm install on the server so node_modules/mysql2 exists');
  }

  return parts.join(' · ');
}

export function resetDbPoolForTests(): void {
  pool = null;
  mysqlModule = null;
}
