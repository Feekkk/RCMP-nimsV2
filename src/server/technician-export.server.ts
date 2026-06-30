import type { RowDataPacket } from 'mysql2';
import type { AssetKind } from '@/lib/inventory-schema';
import { ASSET_KIND_LABEL, formatStatusLabel } from '@/lib/inventory-schema';
import {
  REQUEST_STATUS_ACTIVE,
  REQUEST_STATUS_BOOKED,
  REQUEST_STATUS_CHECKOUT,
} from '@/lib/request-schema';
import type {
  TechnicianAssetExportKind,
  TechnicianReportPdfFilters,
} from '@/lib/technician-export-schema';
import { REPORT_PDF_COLUMNS } from '@/lib/technician-export-schema';
import { attachDisplayNames } from '@/server/azure-directory.server';
import { getDbPool } from '@/server/db';

export type TechnicianExportResult = {
  filename: string;
  contentType: string;
  body: string;
};

const REQUEST_STATUS_IDS = [
  REQUEST_STATUS_ACTIVE,
  REQUEST_STATUS_BOOKED,
  REQUEST_STATUS_CHECKOUT,
] as const;

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

export async function exportTechnicianAssetCsv(
  kind: TechnicianAssetExportKind,
): Promise<TechnicianExportResult> {
  const pool = getDbPool();
  const stamp = new Date().toISOString().slice(0, 10);
  const [rows] = await pool.query<RowDataPacket[]>(`SELECT * FROM \`${kind}\` ORDER BY asset_id`);

  if (rows.length === 0) {
    return {
      filename: `nims-${kind}-${stamp}.csv`,
      contentType: 'text/csv;charset=utf-8',
      body: '',
    };
  }

  const headers = Object.keys(rows[0]);
  return {
    filename: `nims-${kind}-${stamp}.csv`,
    contentType: 'text/csv;charset=utf-8',
    body: toCsv(
      headers,
      rows.map((r) => headers.map((h) => r[h])),
    ),
  };
}

export type AssetReportRow = {
  kind: AssetKind;
  assetId: number;
  brand: string | null;
  model: string | null;
  category: string | null;
  serialNum: string | null;
  statusId: number;
  requestId: number | null;
  requesterName: string | null;
};

function requestFilterSql(
  kind: AssetKind,
  requestFilter: TechnicianReportPdfFilters['requestFilter'],
  alias: string,
): { clause: string; params: unknown[] } {
  if (requestFilter === 'all') return { clause: '', params: [] };

  const openAssignment = `EXISTS (
    SELECT 1 FROM request_assignment ra
    WHERE ra.asset_id = ${alias}.asset_id AND ra.returned_at IS NULL
  )`;

  if (requestFilter === 'request-only') {
    return {
      clause: ` AND (${alias}.status_id IN (?, ?, ?) OR ${openAssignment})`,
      params: [...REQUEST_STATUS_IDS],
    };
  }

  return {
    clause: ` AND ${alias}.status_id NOT IN (?, ?, ?) AND NOT ${openAssignment}`,
    params: [...REQUEST_STATUS_IDS],
  };
}

async function fetchLaptopReportRows(
  filters: TechnicianReportPdfFilters,
): Promise<AssetReportRow[]> {
  const pool = getDbPool();
  const params: unknown[] = [];
  let sql = `
    SELECT l.asset_id, l.brand, l.model, l.category, l.serial_num, l.status_id,
           ra.request_id, u.oid AS requester_oid
    FROM laptop l
    LEFT JOIN request_assignment ra ON ra.asset_id = l.asset_id AND ra.returned_at IS NULL
    LEFT JOIN request r ON r.request_id = ra.request_id AND r.rejected_at IS NULL
    LEFT JOIN users u ON u.id = r.requested_by
    WHERE 1=1`;

  if (filters.statusIds.length > 0) {
    sql += ` AND l.status_id IN (${filters.statusIds.map(() => '?').join(', ')})`;
    params.push(...filters.statusIds);
  }

  const requestClause = requestFilterSql('laptop', filters.requestFilter, 'l');
  sql += requestClause.clause;
  params.push(...requestClause.params);
  sql += ' ORDER BY l.asset_id';

  const [rows] = await pool.query<
    (RowDataPacket & {
      asset_id: number;
      brand: string | null;
      model: string | null;
      category: string | null;
      serial_num: string | null;
      status_id: number;
      request_id: number | null;
      requester_oid: string | null;
      requester_name: string;
    })[]
  >(sql, params);

  await attachDisplayNames(rows, 'requester_oid', 'requester_name');

  return rows.map((r) => ({
    kind: 'laptop' as const,
    assetId: r.asset_id,
    brand: r.brand,
    model: r.model,
    category: r.category,
    serialNum: r.serial_num,
    statusId: r.status_id,
    requestId: r.request_id,
    requesterName: r.request_id ? r.requester_name || null : null,
  }));
}

async function fetchAvReportRows(filters: TechnicianReportPdfFilters): Promise<AssetReportRow[]> {
  const pool = getDbPool();
  const params: unknown[] = [];
  let sql = `
    SELECT a.asset_id, a.brand, a.model, a.category, a.serial_num, a.status_id,
           ra.request_id, u.oid AS requester_oid
    FROM av a
    LEFT JOIN request_assignment ra ON ra.asset_id = a.asset_id AND ra.returned_at IS NULL
    LEFT JOIN request r ON r.request_id = ra.request_id AND r.rejected_at IS NULL
    LEFT JOIN users u ON u.id = r.requested_by
    WHERE 1=1`;

  if (filters.statusIds.length > 0) {
    sql += ` AND a.status_id IN (${filters.statusIds.map(() => '?').join(', ')})`;
    params.push(...filters.statusIds);
  }

  const requestClause = requestFilterSql('av', filters.requestFilter, 'a');
  sql += requestClause.clause;
  params.push(...requestClause.params);
  sql += ' ORDER BY a.asset_id';

  const [rows] = await pool.query<
    (RowDataPacket & {
      asset_id: number;
      brand: string | null;
      model: string | null;
      category: string | null;
      serial_num: string | null;
      status_id: number;
      request_id: number | null;
      requester_oid: string | null;
      requester_name: string;
    })[]
  >(sql, params);

  await attachDisplayNames(rows, 'requester_oid', 'requester_name');

  return rows.map((r) => ({
    kind: 'av' as const,
    assetId: r.asset_id,
    brand: r.brand,
    model: r.model,
    category: r.category,
    serialNum: r.serial_num,
    statusId: r.status_id,
    requestId: r.request_id,
    requesterName: r.request_id ? r.requester_name || null : null,
  }));
}

async function fetchNetworkReportRows(
  filters: TechnicianReportPdfFilters,
): Promise<AssetReportRow[]> {
  const pool = getDbPool();
  const params: unknown[] = [];
  let sql = `
    SELECT n.asset_id, n.brand, n.model, n.serial_num, n.status_id
    FROM network n
    WHERE 1=1`;

  if (filters.statusIds.length > 0) {
    sql += ` AND n.status_id IN (${filters.statusIds.map(() => '?').join(', ')})`;
    params.push(...filters.statusIds);
  }

  const requestClause = requestFilterSql('network', filters.requestFilter, 'n');
  sql += requestClause.clause;
  params.push(...requestClause.params);
  sql += ' ORDER BY n.asset_id';

  const [rows] = await pool.query<
    (RowDataPacket & {
      asset_id: number;
      brand: string | null;
      model: string | null;
      serial_num: string | null;
      status_id: number;
    })[]
  >(sql, params);

  return rows.map((r) => ({
    kind: 'network' as const,
    assetId: r.asset_id,
    brand: r.brand,
    model: r.model,
    category: null,
    serialNum: r.serial_num,
    statusId: r.status_id,
    requestId: null,
    requesterName: null,
  }));
}

export async function fetchFilteredAssetReportRows(
  filters: TechnicianReportPdfFilters,
): Promise<AssetReportRow[]> {
  const rows: AssetReportRow[] = [];
  if (filters.kinds.includes('laptop')) {
    rows.push(...(await fetchLaptopReportRows(filters)));
  }
  if (filters.kinds.includes('av')) {
    rows.push(...(await fetchAvReportRows(filters)));
  }
  if (filters.kinds.includes('network')) {
    rows.push(...(await fetchNetworkReportRows(filters)));
  }

  return rows.sort((a, b) => {
    const kindOrder = { laptop: 0, av: 1, network: 2 } as const;
    if (kindOrder[a.kind] !== kindOrder[b.kind]) return kindOrder[a.kind] - kindOrder[b.kind];
    return a.assetId - b.assetId;
  });
}

export function describeReportFilters(filters: TechnicianReportPdfFilters): string {
  const kinds =
    filters.kinds.length === 3
      ? 'All asset types'
      : filters.kinds.map((k) => ASSET_KIND_LABEL[k]).join(', ');
  const statuses =
    filters.statusIds.length === 0
      ? 'All statuses'
      : filters.statusIds.map((id) => formatStatusLabel(id)).join(', ');
  const requestLabel =
    filters.requestFilter === 'all'
      ? 'All assets'
      : filters.requestFilter === 'request-only'
        ? 'Request-related only'
        : 'Non-request only';
  const columnLabels = filters.columns
    .map((key) => REPORT_PDF_COLUMNS.find((c) => c.key === key)?.label ?? key)
    .join(', ');
  return `Types: ${kinds} | Status: ${statuses} | Request: ${requestLabel} | Columns: ${columnLabels}`;
}
