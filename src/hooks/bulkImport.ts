import { useCallback, useState } from 'react';
import {
  BULK_IMPORT_COLUMNS,
  INVENTORY_STATUSES,
  type AssetKind,
  type CreateAvInput,
  type CreateLaptopInput,
  type CreateNetworkInput,
} from '@/lib/inventory-schema';
import { bulkCreateAvFn, bulkCreateLaptopsFn, bulkCreateNetworkFn } from '@/server/assets.functions';

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
  laptopRows?: CreateLaptopInput[];
  avRows?: CreateAvInput[];
  networkRows?: CreateNetworkInput[];
};

export { BULK_IMPORT_COLUMNS };

const VALID_STATUS_IDS = new Set(INVENTORY_STATUSES.map((s) => s.statusId));

const MOCK_CSV: Record<AssetKind, string> = {
  laptop: `asset_id,serial_num,brand,model,category,part_number,processor,memory,os,storage,gpu,status_id,remarks
10001,DL-5450-001,Dell,Latitude 5450,laptop,,Intel i5-1345U,16GB,Windows 11,512GB,,1,HQ staging
10002,HP-PD400-002,HP,ProDesk 400 G9,desktop,,Intel i5-13500,16GB,Windows 11,256GB,,1,Records floor 1`,
  av: `asset_id,category,brand,model,serial_num,asset_id_old,status_id,remarks
20001,display,Samsung,QM65C,SM-QM65-100,,1,Briefing B
20002,projector,Epson,EB-L200F,EPS-L200F-88,,1,Training West`,
  network: `asset_id,serial_num,brand,model,mac_address,ip_address,status_id,remarks
30001,CS-9200-24P,Cisco,C9200-24P,00:11:22:33:44:55,10.10.1.20,7,Rack 2
30002,AP-505-442,Aruba,AP-505,00:aa:bb:cc:dd:ee,10.10.2.60,7,Lobby East`,
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
  if (!val) errors.push({ row: rowNum, message: `Missing ${name}` });
  return val;
}

function parseAssetId(raw: string, rowNum: number, errors: BulkImportRowError[]): number | null {
  const n = Number(raw.trim());
  if (!raw.trim() || Number.isNaN(n) || n <= 0) {
    errors.push({ row: rowNum, message: 'Invalid asset_id' });
    return null;
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

function parseLaptopRows(headers: string[], rows: string[][]) {
  const errors: BulkImportRowError[] = [];
  const col = buildColumnIndex(headers, BULK_IMPORT_COLUMNS.laptop, errors);
  if (errors.some((e) => e.row === 0)) {
    return { laptopRows: [] as CreateLaptopInput[], errors, validCount: 0, errorCount: 1 };
  }

  const laptopRows: CreateLaptopInput[] = [];

  rows.forEach((row, i) => {
    const rowNum = i + 2;
    const assetId = parseAssetId(requireCell(row, col.get('asset_id')!, 'asset_id', rowNum, errors), rowNum, errors);
    const statusId = parseStatusId(requireCell(row, col.get('status_id')!, 'status_id', rowNum, errors), rowNum, errors);
    const model = requireCell(row, col.get('model')!, 'model', rowNum, errors);

    if (errors.some((e) => e.row === rowNum) || assetId === null || statusId === null) return;

    laptopRows.push({
      assetId,
      serialNum: optionalCell(row, col.get('serial_num')!),
      brand: optionalCell(row, col.get('brand')!),
      model,
      category: optionalCell(row, col.get('category')!),
      partNumber: optionalCell(row, col.get('part_number')!),
      processor: optionalCell(row, col.get('processor')!),
      memory: optionalCell(row, col.get('memory')!),
      os: optionalCell(row, col.get('os')!),
      storage: optionalCell(row, col.get('storage')!),
      gpu: optionalCell(row, col.get('gpu')!),
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

  const avRows: CreateAvInput[] = [];

  rows.forEach((row, i) => {
    const rowNum = i + 2;
    const assetId = parseAssetId(requireCell(row, col.get('asset_id')!, 'asset_id', rowNum, errors), rowNum, errors);
    const statusId = parseStatusId(requireCell(row, col.get('status_id')!, 'status_id', rowNum, errors), rowNum, errors);
    const model = requireCell(row, col.get('model')!, 'model', rowNum, errors);

    if (errors.some((e) => e.row === rowNum) || assetId === null || statusId === null) return;

    avRows.push({
      assetId,
      category: optionalCell(row, col.get('category')!),
      brand: optionalCell(row, col.get('brand')!),
      model,
      serialNum: optionalCell(row, col.get('serial_num')!),
      assetIdOld: optionalCell(row, col.get('asset_id_old')!),
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

  const networkRows: CreateNetworkInput[] = [];

  rows.forEach((row, i) => {
    const rowNum = i + 2;
    const assetId = parseAssetId(requireCell(row, col.get('asset_id')!, 'asset_id', rowNum, errors), rowNum, errors);
    const statusId = parseStatusId(requireCell(row, col.get('status_id')!, 'status_id', rowNum, errors), rowNum, errors);
    const model = requireCell(row, col.get('model')!, 'model', rowNum, errors);

    if (errors.some((e) => e.row === rowNum) || assetId === null || statusId === null) return;

    networkRows.push({
      assetId,
      serialNum: optionalCell(row, col.get('serial_num')!),
      brand: optionalCell(row, col.get('brand')!),
      model,
      macAddress: optionalCell(row, col.get('mac_address')!),
      ipAddress: optionalCell(row, col.get('ip_address')!),
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
    return bulkCreateLaptopsFn({ data: preview.laptopRows });
  }
  if (preview.kind === 'av' && preview.avRows?.length) {
    return bulkCreateAvFn({ data: preview.avRows });
  }
  if (preview.kind === 'network' && preview.networkRows?.length) {
    return bulkCreateNetworkFn({ data: preview.networkRows });
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
  };
}
