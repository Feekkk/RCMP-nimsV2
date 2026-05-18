import { useCallback, useState } from 'react';
import {
  BULK_IMPORT_COLUMNS,
  BULK_IMPORT_REQUIRED,
  INVENTORY_STATUSES,
  type AssetKind,
  type CreateAvInput,
  type CreateLaptopInput,
  type CreateNetworkInput,
} from '@/lib/inventory-schema';
import { getLaptopAssetIdPrefix } from '@/hooks/assetid-generator';
import { parsePurchaseFromRow } from '@/lib/purchase-field-utils';
import {
  bulkCreateAvImportFn,
  bulkCreateLaptopsImportFn,
  bulkCreateNetworkImportFn,
} from '@/server/assets.functions';

export type BulkLaptopImportRow = Omit<CreateLaptopInput, 'assetId'> & { assetId?: number };
export type BulkAvImportRow = Omit<CreateAvInput, 'assetId'> & { assetId?: number };
export type BulkNetworkImportRow = Omit<CreateNetworkInput, 'assetId'> & { assetId?: number };

export type BulkImportRowError = {
  row: number;
  message: string;
};

export type BulkImportPreview = {
  kind: AssetKind;
  headers: string[];
  validCount: number;
  errorCount: number;
  errors: BulkImportRowError[];
  laptopRows?: BulkLaptopImportRow[];
  avRows?: BulkAvImportRow[];
  networkRows?: BulkNetworkImportRow[];
};

export { BULK_IMPORT_COLUMNS, BULK_IMPORT_REQUIRED };

const VALID_STATUS_IDS = new Set(INVENTORY_STATUSES.map((s) => s.statusId));

const MOCK_CSV: Record<AssetKind, string> = {
  laptop: `asset_id,serial_num,brand,model,category,part_number,processor,memory,os,storage,gpu,po_date,po_num,do_date,do_num,invoice_date,invoice_num,purchase_cost,status_id,remarks
,DL-5450-001,Dell,Latitude 5450,Notebook,PN-5450,Intel i5-1345U,16GB,Windows 11,512GB,,150124,PO-2024-001,010224,DO-9001,100224,INV-7788,1299.00,1,HQ staging (auto 12-xx-xxx)
,HP-PD400-002,HP,ProDesk 400 G9,Desktop AIO,,Intel i5-13500,16GB,Windows 11,256GB,,,,,,,,,1,Records floor 1 (auto 14-xx-xxx)`,
  av: `asset_id,asset_id_old,category,brand,model,serial_num,po_date,po_num,do_date,do_num,invoice_date,invoice_num,purchase_cost,status_id,remarks
,AV-LEG-001,display,Samsung,QM65C,SM-QM65-100,010623,PO-AV-100,,,,,899.00,1,Briefing B (auto 88-xx-xxx)
,AV-LEG-002,projector,Epson,EB-L200F,EPS-L200F-88,,,,,,,,,1,Training West`,
  network: `asset_id,serial_num,brand,model,mac_address,ip_address,po_date,po_num,do_date,do_num,invoice_date,invoice_num,purchase_cost,status_id,remarks
,CS-9200-24P,Cisco,C9200-24P,00:11:22:33:44:55,10.10.1.20,100323,PO-NET-55,010423,DO-N-12,,,4500.00,7,Rack 2 (auto 24-xx-xxx)
,AP-505-442,Aruba,AP-505,00:aa:bb:cc:dd:ee,10.10.2.60,,,,,,,,7,Lobby East`,
};

function normalizeHeader(h: string) {
  return h.trim().toLowerCase().replace(/\s+/g, '');
}

function parseCsv(text: string): { headers: string[]; rows: string[][] } {
  const lines = text
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) return { headers: [], rows: [] };

  const parseLine = (line: string): string[] => {
    const out: string[] = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === ',' && !inQuotes) {
        out.push(cur.trim());
        cur = '';
      } else {
        cur += ch;
      }
    }
    out.push(cur.trim());
    return out;
  };

  const headers = parseLine(lines[0]);
  const rows = lines.slice(1).map(parseLine);
  return { headers, rows };
}

function parseStatusId(raw: string, row: number, errors: BulkImportRowError[]): number | null {
  const n = Number(raw.trim());
  if (!raw.trim() || Number.isNaN(n) || !VALID_STATUS_IDS.has(n as (typeof INVENTORY_STATUSES)[number]['statusId'])) {
    errors.push({ row, message: `Invalid status_id "${raw}" (use 1–11 per status table)` });
    return null;
  }
  return n;
}

function requireCell(row: string[], index: number, name: string, rowNum: number, errors: BulkImportRowError[]) {
  const val = row[index]?.trim() ?? '';
  if (!val) errors.push({ row: rowNum, message: `Missing required column: ${name}` });
  return val;
}

/** Blank cell → auto-generate on import; otherwise use provided ID. */
function parseOptionalAssetId(
  raw: string,
  rowNum: number,
  errors: BulkImportRowError[],
): number | undefined {
  const val = raw?.trim() ?? '';
  if (!val) return undefined;
  const n = Number(val);
  if (Number.isNaN(n) || n <= 0) {
    errors.push({ row: rowNum, message: 'Invalid asset_id' });
    return undefined;
  }
  return n;
}

function optionalCell(row: string[], index: number) {
  const val = row[index]?.trim() ?? '';
  return val || null;
}

function buildColumnIndex(headers: string[], expected: readonly string[], errors: BulkImportRowError[]) {
  const index = new Map<string, number>();
  headers.forEach((h, i) => index.set(normalizeHeader(h), i));

  for (const col of expected) {
    if (!index.has(col)) {
      errors.push({ row: 0, message: `Missing column: ${col}` });
    }
  }
  return index;
}

function rowHasErrors(errors: BulkImportRowError[], rowNum: number) {
  return errors.some((e) => e.row === rowNum);
}

function parseLaptopRows(headers: string[], rows: string[][]) {
  const errors: BulkImportRowError[] = [];
  const col = buildColumnIndex(headers, BULK_IMPORT_COLUMNS.laptop, errors);
  if (errors.some((e) => e.row === 0)) {
    return { laptopRows: [] as CreateLaptopInput[], errors, validCount: 0, errorCount: 1 };
  }

  const laptopRows: BulkLaptopImportRow[] = [];

  rows.forEach((row, i) => {
    const rowNum = i + 2;
    const assetId = parseOptionalAssetId(row[col.get('asset_id')!] ?? '', rowNum, errors);
    const serialNum = requireCell(row, col.get('serial_num')!, 'serial_num', rowNum, errors);
    const category = requireCell(row, col.get('category')!, 'category', rowNum, errors);
    const statusId = parseStatusId(requireCell(row, col.get('status_id')!, 'status_id', rowNum, errors), rowNum, errors);
    const purchase = parsePurchaseFromRow(row, col, rowNum, errors);

    if (category) {
      try {
        getLaptopAssetIdPrefix(category);
      } catch (e) {
        errors.push({
          row: rowNum,
          message: e instanceof Error ? e.message : 'Invalid laptop category for asset ID',
        });
      }
    }

    if (rowHasErrors(errors, rowNum) || statusId === null) return;

    laptopRows.push({
      ...(assetId !== undefined ? { assetId } : {}),
      serialNum,
      brand: optionalCell(row, col.get('brand')!),
      model: optionalCell(row, col.get('model')!),
      category,
      partNumber: optionalCell(row, col.get('part_number')!),
      processor: optionalCell(row, col.get('processor')!),
      memory: optionalCell(row, col.get('memory')!),
      os: optionalCell(row, col.get('os')!),
      storage: optionalCell(row, col.get('storage')!),
      gpu: optionalCell(row, col.get('gpu')!),
      ...purchase,
      statusId,
      remarks: optionalCell(row, col.get('remarks')!),
    });
  });

  const rowErrorRows = new Set(errors.map((e) => e.row).filter((r) => r > 0));
  return { laptopRows, errors, validCount: laptopRows.length, errorCount: rowErrorRows.size };
}

function parseAvRows(headers: string[], rows: string[][]) {
  const errors: BulkImportRowError[] = [];
  const col = buildColumnIndex(headers, BULK_IMPORT_COLUMNS.av, errors);
  if (errors.some((e) => e.row === 0)) {
    return { avRows: [] as CreateAvInput[], errors, validCount: 0, errorCount: 1 };
  }

  const avRows: BulkAvImportRow[] = [];

  rows.forEach((row, i) => {
    const rowNum = i + 2;
    const assetId = parseOptionalAssetId(row[col.get('asset_id')!] ?? '', rowNum, errors);
    const assetIdOld = requireCell(row, col.get('asset_id_old')!, 'asset_id_old', rowNum, errors);
    const statusId = parseStatusId(requireCell(row, col.get('status_id')!, 'status_id', rowNum, errors), rowNum, errors);
    const purchase = parsePurchaseFromRow(row, col, rowNum, errors);

    if (rowHasErrors(errors, rowNum) || statusId === null) return;

    avRows.push({
      ...(assetId !== undefined ? { assetId } : {}),
      assetIdOld,
      category: optionalCell(row, col.get('category')!),
      brand: optionalCell(row, col.get('brand')!),
      model: optionalCell(row, col.get('model')!),
      serialNum: optionalCell(row, col.get('serial_num')!),
      ...purchase,
      statusId,
      remarks: optionalCell(row, col.get('remarks')!),
    });
  });

  const rowErrorRows = new Set(errors.map((e) => e.row).filter((r) => r > 0));
  return { avRows, errors, validCount: avRows.length, errorCount: rowErrorRows.size };
}

function parseNetworkRows(headers: string[], rows: string[][]) {
  const errors: BulkImportRowError[] = [];
  const col = buildColumnIndex(headers, BULK_IMPORT_COLUMNS.network, errors);
  if (errors.some((e) => e.row === 0)) {
    return { networkRows: [] as CreateNetworkInput[], errors, validCount: 0, errorCount: 1 };
  }

  const networkRows: BulkNetworkImportRow[] = [];

  rows.forEach((row, i) => {
    const rowNum = i + 2;
    const assetId = parseOptionalAssetId(row[col.get('asset_id')!] ?? '', rowNum, errors);
    const statusId = parseStatusId(requireCell(row, col.get('status_id')!, 'status_id', rowNum, errors), rowNum, errors);
    const purchase = parsePurchaseFromRow(row, col, rowNum, errors);

    if (rowHasErrors(errors, rowNum) || statusId === null) return;

    networkRows.push({
      ...(assetId !== undefined ? { assetId } : {}),
      serialNum: optionalCell(row, col.get('serial_num')!),
      brand: optionalCell(row, col.get('brand')!),
      model: optionalCell(row, col.get('model')!),
      macAddress: optionalCell(row, col.get('mac_address')!),
      ipAddress: optionalCell(row, col.get('ip_address')!),
      ...purchase,
      statusId,
      remarks: optionalCell(row, col.get('remarks')!),
    });
  });

  const rowErrorRows = new Set(errors.map((e) => e.row).filter((r) => r > 0));
  return { networkRows, errors, validCount: networkRows.length, errorCount: rowErrorRows.size };
}

export function parseBulkImportCsv(kind: AssetKind, csvText: string): BulkImportPreview {
  const { headers, rows } = parseCsv(csvText);
  const base = { kind, headers };

  if (headers.length === 0) {
    return { ...base, validCount: 0, errorCount: 1, errors: [{ row: 0, message: 'CSV is empty' }] };
  }

  if (kind === 'laptop') {
    return { ...base, ...parseLaptopRows(headers, rows) };
  }
  if (kind === 'av') {
    return { ...base, ...parseAvRows(headers, rows) };
  }
  return { ...base, ...parseNetworkRows(headers, rows) };
}

export function getBulkImportTemplate(kind: AssetKind): string {
  return `${BULK_IMPORT_COLUMNS[kind].join(',')}\n`;
}

export function getBulkImportMockCsv(kind: AssetKind): string {
  return MOCK_CSV[kind];
}

export function downloadCsvFile(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function commitBulkImport(preview: BulkImportPreview): Promise<number> {
  if (preview.kind === 'laptop' && preview.laptopRows?.length) {
    return bulkCreateLaptopsImportFn({ data: preview.laptopRows });
  }
  if (preview.kind === 'av' && preview.avRows?.length) {
    return bulkCreateAvImportFn({ data: preview.avRows });
  }
  if (preview.kind === 'network' && preview.networkRows?.length) {
    return bulkCreateNetworkImportFn({ data: preview.networkRows });
  }
  return 0;
}

export function useBulkImport() {
  const [preview, setPreview] = useState<BulkImportPreview | null>(null);
  const [isParsing, setIsParsing] = useState(false);

  const parseText = useCallback((kind: AssetKind, text: string) => {
    setIsParsing(true);
    try {
      const result = parseBulkImportCsv(kind, text);
      setPreview(result);
      return result;
    } finally {
      setIsParsing(false);
    }
  }, []);

  const parseFile = useCallback(
    async (kind: AssetKind, file: File) => {
      const text = await file.text();
      return parseText(kind, text);
    },
    [parseText],
  );

  const loadMockSample = useCallback(
    (kind: AssetKind) => parseText(kind, getBulkImportMockCsv(kind)),
    [parseText],
  );

  const clearPreview = useCallback(() => setPreview(null), []);

  const commit = useCallback(async () => {
    if (!preview || preview.validCount === 0) return 0;
    return commitBulkImport(preview);
  }, [preview]);

  return {
    preview,
    isParsing,
    parseText,
    parseFile,
    loadMockSample,
    clearPreview,
    commit,
    getTemplate: getBulkImportTemplate,
    getMockCsv: getBulkImportMockCsv,
    columns: BULK_IMPORT_COLUMNS,
    requiredColumns: BULK_IMPORT_REQUIRED,
  };
}
