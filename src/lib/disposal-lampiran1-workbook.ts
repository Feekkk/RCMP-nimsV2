import ExcelJS from 'exceljs';
import type { DisposalReport } from '@shared/lib/disposal-schema';
import { ASSET_KIND_LABEL } from '@shared/lib/inventory-schema';
import { isoToLocalDate } from '@shared/lib/date-format';

const HEADERS = [
  'BIL',
  'TARIKH (PENERIMAAN)',
  'NAMA ASET',
  'PEMBEKAL',
  'KUANTITI',
  'KOS/\nUNIT (RM)',
  'JENAMA',
  'MODEL ',
  'NO SIRI',
  'JENIS ITEM',
  'NO TAG',
  'NO RUJUKAN PELUPUSAN',
];

const COLUMN_WIDTHS = [13, 17.57, 29.86, 19.14, 11.43, 12, 10.71, 12.86, 15.29, 0, 11, 13.86];

const BASE_FONT: Partial<ExcelJS.Font> = { name: 'Aptos Narrow', size: 11, family: 2, scheme: 'minor' };
const THIN: Partial<ExcelJS.Border> = { style: 'thin', color: { argb: 'FF000000' } };
const DOUBLE: Partial<ExcelJS.Border> = { style: 'double', color: { argb: 'FF000000' } };
const BOX: Partial<ExcelJS.Borders> = { top: THIN, left: THIN, bottom: THIN, right: THIN };

export async function downloadDisposalLampiran1(report: DisposalReport) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Sheet1', {
    pageSetup: { margins: { left: 0.7, right: 0.7, top: 0.75, bottom: 0.75, header: 0.3, footer: 0.3 } },
  });

  COLUMN_WIDTHS.forEach((width, index) => {
    const column = sheet.getColumn(index + 1);
    column.width = width;
    column.hidden = width === 0;
  });

  const banner = (range: string, value: string, horizontal: 'left' | 'center') => {
    sheet.mergeCells(range);
    const cell = sheet.getCell(range.split(':')[0]);
    cell.value = value;
    cell.font = BASE_FONT;
    cell.alignment = { horizontal, vertical: 'middle' };
    return cell;
  };

  banner('A1:L1', 'UNIVERSITI KUALA LUMPUR ROYAL COLLEGE OF MEDICINE PERAK', 'center');
  banner('A2:L2', 'SENARAI ASET P.C.M. SDN. BHD. YANG HENDAK DILUPUSKAN', 'center');
  banner('A3:C3', `NO RUJUKAN:${report.noRujukanPelupusan}`, 'left');
  banner('J3:L3', 'LAMPIRAN 1', 'center');
  ['J3', 'K3', 'L3'].forEach((address) => {
    sheet.getCell(address).border = { bottom: { style: 'thin' } };
  });

  const header = sheet.getRow(4);
  header.height = 38.25;
  HEADERS.forEach((label, index) => {
    const cell = header.getCell(index + 1);
    cell.value = label;
    cell.font = { name: 'Verdana', size: 10, family: 2, bold: true };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = BOX;
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF33CCFF' } };
  });

  const firstDataRow = 5;
  report.lampiran1.forEach((asset, index) => {
    const row = sheet.getRow(firstDataRow + index);
    row.height = 22.5;
    row.values = [
      index + 1,
      (asset.tarikhPenerimaan && isoToLocalDate(asset.tarikhPenerimaan)) || '',
      asset.nama,
      asset.supplier ?? '',
      asset.qty,
      asset.purchaseCost ?? '',
      asset.brand ?? '',
      asset.model ?? '',
      asset.serialNum ?? '',
      ASSET_KIND_LABEL[asset.kind],
      String(asset.assetId),
      report.noRujukanPelupusan,
    ];
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      cell.font = BASE_FONT;
      cell.border = BOX;
      cell.alignment = { horizontal: colNumber === 3 ? 'left' : 'center', vertical: 'middle', wrapText: true };
    });
    row.getCell(2).numFmt = 'dd/mm/yyyy';
    row.getCell(6).numFmt = '#,##0.00';
  });

  const lastDataRow = firstDataRow + Math.max(report.lampiran1.length, 1) - 1;
  const totals = sheet.getRow(lastDataRow + 1);
  totals.height = 39.75;
  totals.getCell(5).value = { formula: `SUM(E${firstDataRow}:E${lastDataRow})` } as ExcelJS.CellFormulaValue;
  totals.getCell(6).value = { formula: `SUM(F${firstDataRow}:F${lastDataRow})` } as ExcelJS.CellFormulaValue;
  [5, 6].forEach((col) => {
    const cell = totals.getCell(col);
    cell.font = BASE_FONT;
    cell.border = { top: DOUBLE, bottom: DOUBLE };
    cell.alignment = col === 5 ? { horizontal: 'center', vertical: 'middle' } : { vertical: 'middle' };
  });
  totals.getCell(6).numFmt = '#,##0.00';

  const buffer = await workbook.xlsx.writeBuffer();
  const url = URL.createObjectURL(
    new Blob([new Uint8Array(buffer as ArrayBuffer)], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }),
  );
  const link = document.createElement('a');
  link.href = url;
  link.download = `LAMPIRAN 1 - ${report.noRujukanPelupusan.replace(/[\\/:*?"<>|]/g, '-')}.xlsx`;
  link.click();
  URL.revokeObjectURL(url);
}
