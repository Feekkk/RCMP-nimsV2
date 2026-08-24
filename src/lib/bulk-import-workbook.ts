import ExcelJS from 'exceljs';
import {
  bulkImportTemplateColumns,
  bulkImportTemplateRequiredColumns,
  bulkImportTemplateStatusId,
  type AssetKind,
  type BulkImportTemplateVariant,
} from '@shared/lib/inventory-schema';

const REQUIRED_FILL = 'FACC15';
const HEADER_FONT = '0F172A';

function templateFilename(kind: AssetKind, variant: BulkImportTemplateVariant): string {
  if (variant === 'place') return `${kind}-facility-template.xlsx`;
  if (variant === 'deploy') {
    return kind === 'laptop' ? `${kind}-handover-template.xlsx` : `${kind}-deploy-template.xlsx`;
  }
  return `${kind}-template.xlsx`;
}

function cellText(value: ExcelJS.CellValue): string {
  if (value == null) return '';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value).trim();
  }
  if (value instanceof Date) {
    const day = String(value.getDate());
    const month = String(value.getMonth() + 1);
    const year = String(value.getFullYear()).slice(-2);
    return `${day}/${month}/${year}`;
  }
  if (typeof value === 'object' && 'text' in value && typeof value.text === 'string') {
    return value.text.trim();
  }
  if (typeof value === 'object' && 'richText' in value && Array.isArray(value.richText)) {
    return value.richText.map((part) => part.text).join('').trim();
  }
  if (typeof value === 'object' && 'result' in value) {
    return cellText(value.result as ExcelJS.CellValue);
  }
  return String(value).trim();
}

function csvEscape(value: string): string {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

function worksheetToCsv(sheet: ExcelJS.Worksheet): string {
  const rows: string[] = [];
  sheet.eachRow({ includeEmpty: false }, (row) => {
    const values = Array.isArray(row.values) ? row.values.slice(1) : [];
    const cells = values.map((value) => csvEscape(cellText(value as ExcelJS.CellValue)));
    if (cells.some((cell) => cell.length > 0)) rows.push(cells.join(','));
  });
  return rows.join('\n');
}

export async function excelFileToCsv(file: File): Promise<string> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await file.arrayBuffer());
  const sheet = workbook.worksheets[0];
  if (!sheet) throw new Error('The spreadsheet is empty.');
  return worksheetToCsv(sheet);
}

export async function downloadBulkImportTemplate(
  kind: AssetKind,
  variant: BulkImportTemplateVariant,
) {
  const columns = bulkImportTemplateColumns(kind, variant);
  const required = new Set(bulkImportTemplateRequiredColumns(kind, variant));
  const statusId = String(bulkImportTemplateStatusId(variant));

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Import');

  const header = sheet.addRow([...columns]);
  header.height = 18;
  header.eachCell((cell, colNumber) => {
    const name = columns[colNumber - 1];
    cell.font = { bold: true, color: { argb: `FF${HEADER_FONT}` } };
    cell.alignment = { vertical: 'middle' };
    if (required.has(name)) {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: `FF${REQUIRED_FILL}` },
      };
    }
  });

  const data = columns.map((column) => (column === 'status_id' ? statusId : ''));
  sheet.addRow(data);

  columns.forEach((column, index) => {
    sheet.getColumn(index + 1).width = Math.max(14, column.length + 4);
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([new Uint8Array(buffer as ArrayBuffer)], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = templateFilename(kind, variant);
  a.click();
  URL.revokeObjectURL(url);
}
