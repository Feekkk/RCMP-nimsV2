import { useCallback, useState } from 'react';
import {
  createAvAsset,
  createLaptopAsset,
  createNetworkAsset,
  type AssetKind,
  type AvCategory,
  type CreateAvInput,
  type CreateLaptopInput,
  type CreateNetworkInput,
  type LaptopFormFactor,
  type NetworkCategory,
  type StockStatus,
} from '@/hooks/assets';

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
  /** Parsed rows ready to commit (1-based row numbers in errors only). */
  laptopRows?: CreateLaptopInput[];
  avRows?: CreateAvInput[];
  networkRows?: CreateNetworkInput[];
};

const LAPTOP_COLUMNS = [
  'formFactor',
  'model',
  'assetTag',
  'serial',
  'location',
  'status',
  'cpu',
  'ramGb',
  'storageGb',
  'os',
] as const;

const AV_COLUMNS = [
  'category',
  'model',
  'assetTag',
  'serial',
  'location',
  'status',
  'resolution',
  'hdmiPorts',
  'wattage',
] as const;

const NETWORK_COLUMNS = [
  'category',
  'model',
  'assetTag',
  'serial',
  'location',
  'status',
  'portCount',
  'firmware',
  'ipAddress',
] as const;

export const BULK_IMPORT_COLUMNS: Record<AssetKind, readonly string[]> = {
  laptop: LAPTOP_COLUMNS,
  av: AV_COLUMNS,
  network: NETWORK_COLUMNS,
};

const MOCK_CSV: Record<AssetKind, string> = {
  laptop: `formFactor,model,assetTag,serial,location,status,cpu,ramGb,storageGb,os
laptop,Dell Latitude 5450,AST-10501,DL-5450-001,HQ — Staging,in_stock,Intel i5-1345U,16,512,Windows 11
desktop,HP ProDesk 400 G9,AST-10502,HP-PD400-002,Records — Floor 1,in_stock,Intel i5-13500,16,256,Windows 11`,
  av: `category,model,assetTag,serial,location,status,resolution,hdmiPorts,wattage
display,Samsung QM65C,AV-20101,SM-QM65-100,Briefing B,in_stock,3840×2160,3,
projector,Epson EB-L200F,AV-20102,EPS-L200F-88,Training West,in_stock,1920×1080,2,3600`,
  network: `category,model,assetTag,serial,location,status,portCount,firmware,ipAddress
switch,Cisco C9200-24P,NET-30101,CS-9200-24P,Rack 2,in_stock,24,17.9.4,10.10.1.20
access_point,Aruba AP-505,NET-30102,AP-505-442,Lobby East,in_stock,2,8.12.0,10.10.2.60`,
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

function parseStatus(raw: string, row: number, errors: BulkImportRowError[]): StockStatus | null {
  const v = raw.trim().toLowerCase().replace(/\s+/g, '_');
  if (v === 'in_stock' || v === 'instock' || v === 'in') return 'in_stock';
  if (v === 'out_of_stock' || v === 'outofstock' || v === 'out') return 'out_of_stock';
  errors.push({ row, message: `Invalid status "${raw}" (use in_stock or out_of_stock)` });
  return null;
}

function requireCell(row: string[], index: number, name: string, rowNum: number, errors: BulkImportRowError[]) {
  const val = row[index]?.trim() ?? '';
  if (!val) errors.push({ row: rowNum, message: `Missing ${name}` });
  return val;
}

function parseNumber(raw: string, name: string, rowNum: number, errors: BulkImportRowError[]): number | null {
  const n = Number(raw);
  if (raw.trim() === '' || Number.isNaN(n)) {
    errors.push({ row: rowNum, message: `Invalid ${name}` });
    return null;
  }
  return n;
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

function parseLaptopRows(
  headers: string[],
  rows: string[][],
): Pick<BulkImportPreview, 'laptopRows' | 'errors' | 'validCount' | 'errorCount'> {
  const errors: BulkImportRowError[] = [];
  const col = buildColumnIndex(headers, LAPTOP_COLUMNS, errors);
  if (errors.some((e) => e.row === 0)) {
    return { laptopRows: [], errors, validCount: 0, errorCount: 1 };
  }

  const laptopRows: CreateLaptopInput[] = [];
  const formFactors: LaptopFormFactor[] = ['laptop', 'desktop'];

  rows.forEach((row, i) => {
    const rowNum = i + 2;
    const ff = requireCell(row, col.get('formFactor')!, 'formFactor', rowNum, errors).toLowerCase();
    if (ff && !formFactors.includes(ff as LaptopFormFactor)) {
      errors.push({ row: rowNum, message: `formFactor must be laptop or desktop` });
    }
    const status = parseStatus(requireCell(row, col.get('status')!, 'status', rowNum, errors), rowNum, errors);
    const ram = parseNumber(requireCell(row, col.get('ramGb')!, 'ramGb', rowNum, errors), 'ramGb', rowNum, errors);
    const storage = parseNumber(
      requireCell(row, col.get('storageGb')!, 'storageGb', rowNum, errors),
      'storageGb',
      rowNum,
      errors,
    );

    const model = requireCell(row, col.get('model')!, 'model', rowNum, errors);
    const assetTag = requireCell(row, col.get('assetTag')!, 'assetTag', rowNum, errors);
    const serial = requireCell(row, col.get('serial')!, 'serial', rowNum, errors);
    const location = requireCell(row, col.get('location')!, 'location', rowNum, errors);
    const cpu = requireCell(row, col.get('cpu')!, 'cpu', rowNum, errors);
    const os = requireCell(row, col.get('os')!, 'os', rowNum, errors);

    if (errors.some((e) => e.row === rowNum) || !status || ram === null || storage === null) return;

    laptopRows.push({
      formFactor: ff as LaptopFormFactor,
      model,
      assetTag,
      serial,
      location,
      status,
      cpu,
      ramGb: ram,
      storageGb: storage,
      os,
    });
  });

  const rowErrorRows = new Set(errors.map((e) => e.row).filter((r) => r > 0));
  return {
    laptopRows,
    errors,
    validCount: laptopRows.length,
    errorCount: rowErrorRows.size,
  };
}

function parseAvRows(
  headers: string[],
  rows: string[][],
): Pick<BulkImportPreview, 'avRows' | 'errors' | 'validCount' | 'errorCount'> {
  const errors: BulkImportRowError[] = [];
  const col = buildColumnIndex(headers, AV_COLUMNS, errors);
  if (errors.some((e) => e.row === 0)) {
    return { avRows: [], errors, validCount: 0, errorCount: 1 };
  }

  const avRows: CreateAvInput[] = [];
  const categories: AvCategory[] = ['display', 'projector', 'audio', 'camera'];

  rows.forEach((row, i) => {
    const rowNum = i + 2;
    const cat = requireCell(row, col.get('category')!, 'category', rowNum, errors).toLowerCase();
    if (cat && !categories.includes(cat as AvCategory)) {
      errors.push({ row: rowNum, message: `Invalid AV category` });
    }
    const status = parseStatus(requireCell(row, col.get('status')!, 'status', rowNum, errors), rowNum, errors);
    const hdmi = parseNumber(
      requireCell(row, col.get('hdmiPorts')!, 'hdmiPorts', rowNum, errors),
      'hdmiPorts',
      rowNum,
      errors,
    );
    const wattRaw = row[col.get('wattage')!]?.trim() ?? '';

    const model = requireCell(row, col.get('model')!, 'model', rowNum, errors);
    const assetTag = requireCell(row, col.get('assetTag')!, 'assetTag', rowNum, errors);
    const serial = requireCell(row, col.get('serial')!, 'serial', rowNum, errors);
    const location = requireCell(row, col.get('location')!, 'location', rowNum, errors);
    const resolution = requireCell(row, col.get('resolution')!, 'resolution', rowNum, errors);

    if (errors.some((e) => e.row === rowNum) || !status || hdmi === null) return;

    avRows.push({
      category: cat as AvCategory,
      model,
      assetTag,
      serial,
      location,
      status,
      resolution,
      hdmiPorts: hdmi,
      wattage: wattRaw ? Number(wattRaw) : undefined,
    });
  });

  const rowErrorRows = new Set(errors.map((e) => e.row).filter((r) => r > 0));
  return { avRows, errors, validCount: avRows.length, errorCount: rowErrorRows.size };
}

function parseNetworkRows(
  headers: string[],
  rows: string[][],
): Pick<BulkImportPreview, 'networkRows' | 'errors' | 'validCount' | 'errorCount'> {
  const errors: BulkImportRowError[] = [];
  const col = buildColumnIndex(headers, NETWORK_COLUMNS, errors);
  if (errors.some((e) => e.row === 0)) {
    return { networkRows: [], errors, validCount: 0, errorCount: 1 };
  }

  const networkRows: CreateNetworkInput[] = [];
  const categories: NetworkCategory[] = ['switch', 'router', 'firewall', 'access_point'];

  rows.forEach((row, i) => {
    const rowNum = i + 2;
    const cat = requireCell(row, col.get('category')!, 'category', rowNum, errors).toLowerCase();
    const normalized = cat === 'accesspoint' ? 'access_point' : cat;
    if (normalized && !categories.includes(normalized as NetworkCategory)) {
      errors.push({ row: rowNum, message: `Invalid network category` });
    }
    const status = parseStatus(requireCell(row, col.get('status')!, 'status', rowNum, errors), rowNum, errors);
    const ports = parseNumber(
      requireCell(row, col.get('portCount')!, 'portCount', rowNum, errors),
      'portCount',
      rowNum,
      errors,
    );

    const model = requireCell(row, col.get('model')!, 'model', rowNum, errors);
    const assetTag = requireCell(row, col.get('assetTag')!, 'assetTag', rowNum, errors);
    const serial = requireCell(row, col.get('serial')!, 'serial', rowNum, errors);
    const location = requireCell(row, col.get('location')!, 'location', rowNum, errors);
    const firmware = requireCell(row, col.get('firmware')!, 'firmware', rowNum, errors);
    const ipAddress = requireCell(row, col.get('ipAddress')!, 'ipAddress', rowNum, errors);

    if (errors.some((e) => e.row === rowNum) || !status || ports === null) return;

    networkRows.push({
      category: normalized as NetworkCategory,
      model,
      assetTag,
      serial,
      location,
      status,
      portCount: ports,
      firmware,
      ipAddress,
    });
  });

  const rowErrorRows = new Set(errors.map((e) => e.row).filter((r) => r > 0));
  return { networkRows, errors, validCount: networkRows.length, errorCount: rowErrorRows.size };
}

export function parseBulkImportCsv(kind: AssetKind, csvText: string): BulkImportPreview {
  const { headers, rows } = parseCsv(csvText);
  const base = { kind, headers };

  if (headers.length === 0) {
    return {
      ...base,
      validCount: 0,
      errorCount: 1,
      errors: [{ row: 0, message: 'CSV is empty' }],
    };
  }

  if (kind === 'laptop') {
    const parsed = parseLaptopRows(headers, rows);
    return { ...base, ...parsed };
  }
  if (kind === 'av') {
    const parsed = parseAvRows(headers, rows);
    return { ...base, ...parsed };
  }
  const parsed = parseNetworkRows(headers, rows);
  return { ...base, ...parsed };
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

export function commitBulkImport(preview: BulkImportPreview): number {
  if (preview.kind === 'laptop' && preview.laptopRows) {
    preview.laptopRows.forEach((row) => createLaptopAsset(row));
    return preview.laptopRows.length;
  }
  if (preview.kind === 'av' && preview.avRows) {
    preview.avRows.forEach((row) => createAvAsset(row));
    return preview.avRows.length;
  }
  if (preview.kind === 'network' && preview.networkRows) {
    preview.networkRows.forEach((row) => createNetworkAsset(row));
    return preview.networkRows.length;
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

  const commit = useCallback(() => {
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
