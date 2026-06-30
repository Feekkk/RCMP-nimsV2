import type { Template } from '@pdfme/common';
import { generate } from '@pdfme/generator';
import { image, text } from '@pdfme/schemas';
import { ASSET_KIND_LABEL, formatStatusLabel } from '@/lib/inventory-schema';
import type { TechnicianReportPdfFilters } from '@/lib/technician-export-schema';
import {
  BASE_PDF,
  COMPUTER_GENERATED_FOOTER,
  IT_DEPT_HEADER,
  T,
  boldContent,
  loadLogoBase64,
  pageFooterField,
  pageHeaderFields,
} from '@/server/pdf-form-common.server';
import {
  describeReportFilters,
  fetchFilteredAssetReportRows,
  type AssetReportRow,
} from '@/server/technician-export.server';

const ROWS_PER_PAGE = 24;
const TABLE_HDR_BG = '#E8E8E8';

function padCell(value: string, width: number): string {
  const trimmed = value.length > width ? `${value.slice(0, width - 1)}…` : value;
  return trimmed.padEnd(width, ' ');
}

function formatRow(row: AssetReportRow): string {
  const kind = ASSET_KIND_LABEL[row.kind].slice(0, 10);
  const assetId = String(row.assetId).padEnd(6, ' ');
  const model = padCell(row.model?.trim() || '—', 14);
  const brand = padCell(row.brand?.trim() || '—', 10);
  const serial = padCell(row.serialNum?.trim() || '—', 12);
  const status = padCell(formatStatusLabel(row.statusId), 14);
  const request = row.requestId ? String(row.requestId).padEnd(6, ' ') : '—'.padEnd(6, ' ');
  const requester = padCell(row.requesterName?.trim() || '—', 16);
  return `${kind} ${assetId} ${model} ${brand} ${serial} ${status} ${request} ${requester}`;
}

function buildTableHeader(): string {
  return [
    padCell('Type', 10),
    'ID'.padEnd(6, ' '),
    padCell('Model', 14),
    padCell('Brand', 10),
    padCell('Serial', 12),
    padCell('Status', 14),
    'Req'.padEnd(6, ' '),
    padCell('Requester', 16),
  ].join(' ');
}

function buildPageSchemas(pageIndex: number, totalPages: number, showMeta: boolean) {
  const prefix = `p${pageIndex}`;
  const fields = [
    ...pageHeaderFields(prefix, 'ASSET INVENTORY REPORT', IT_DEPT_HEADER),
    T(`${prefix}_meta`, 14, 76, 182, showMeta ? 14 : 0, 8, { lineHeight: 1.25 }),
    T(`${prefix}_tableHdr`, 14, showMeta ? 92 : 76, 182, 6, 8, {
      backgroundColor: TABLE_HDR_BG,
      markdown: true,
      content: boldContent(buildTableHeader()),
    }),
    T(`${prefix}_tableBody`, 14, showMeta ? 99 : 83, 182, 170, 7.5, {
      lineHeight: 1.2,
      fontSize: 7.5,
      overflow: 'visible',
    }),
    T(`${prefix}_pageNo`, 14, 272, 182, 6, 8, { align: 'right' }),
    pageFooterField(prefix),
  ];
  return fields;
}

function buildTemplate(rowCount: number, filters: TechnicianReportPdfFilters): Template {
  const totalPages = Math.max(1, Math.ceil(rowCount / ROWS_PER_PAGE));
  const schemas = Array.from({ length: totalPages }, (_, index) =>
    buildPageSchemas(index + 1, totalPages, index === 0),
  );
  return { basePdf: BASE_PDF, schemas };
}

function buildInputs(
  rows: AssetReportRow[],
  filters: TechnicianReportPdfFilters,
  logo: string,
): Record<string, string>[] {
  const generatedAt = new Date().toLocaleString('en-MY', { hour12: false });
  const totalPages = Math.max(1, Math.ceil(rows.length / ROWS_PER_PAGE));
  const input: Record<string, string> = {};

  for (let page = 0; page < totalPages; page++) {
    const prefix = `p${page + 1}`;
    const chunk = rows.slice(page * ROWS_PER_PAGE, (page + 1) * ROWS_PER_PAGE);
    input[`${prefix}_logo`] = logo;
    input[`${prefix}_genFooter`] = COMPUTER_GENERATED_FOOTER;
    input[`${prefix}_pageNo`] = `Page ${page + 1} of ${totalPages}`;
    input[`${prefix}_tableBody`] = chunk.map(formatRow).join('\n') || 'No assets match the selected filters.';
    if (page === 0) {
      input[`${prefix}_meta`] = [
        `Generated: ${generatedAt}`,
        `Total assets: ${rows.length}`,
        describeReportFilters(filters),
      ].join('\n');
    }
  }

  return [input];
}

export async function generateAssetReportPdfBase64(
  filters: TechnicianReportPdfFilters,
): Promise<{ base64: string; filename: string; count: number }> {
  const rows = await fetchFilteredAssetReportRows(filters);
  const stamp = new Date().toISOString().slice(0, 10);
  const logo = loadLogoBase64();
  const template = buildTemplate(rows.length, filters);
  const pdf = await generate({
    template,
    inputs: buildInputs(rows, filters, logo),
    plugins: { text, image },
  });

  return {
    base64: Buffer.from(pdf).toString('base64'),
    filename: `nims-asset-report-${stamp}.pdf`,
    count: rows.length,
  };
}
