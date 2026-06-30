import type { Template } from '@pdfme/common';
import { generate } from '@pdfme/generator';
import { image, text } from '@pdfme/schemas';
import { ASSET_KIND_LABEL, formatStatusLabel } from '@/lib/inventory-schema';
import {
  REPORT_PDF_COLUMNS,
  type ReportPdfColumn,
  type TechnicianReportPdfFilters,
} from '@/lib/technician-export-schema';
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

const TABLE_X = 14;
const TABLE_W = 182;
const HDR_H = 7;
const TABLE_HDR_BG = '#E8E8E8';
const BODY_FONT = 7.5;
const HDR_FONT = 8;

type ColumnLayout = {
  key: ReportPdfColumn;
  label: string;
  x: number;
  w: number;
};

type TableLayout = {
  rowHeight: number;
  rowsPerPage: number;
  bodyFont: number;
};

function tableLayout(filters: TechnicianReportPdfFilters): TableLayout {
  if (filters.columns.includes('history')) {
    return { rowHeight: 10, rowsPerPage: 14, bodyFont: 7 };
  }
  return { rowHeight: 6.5, rowsPerPage: 24, bodyFont: BODY_FONT };
}

function cellValue(row: AssetReportRow, key: ReportPdfColumn): string {
  switch (key) {
    case 'type':
      return ASSET_KIND_LABEL[row.kind];
    case 'id':
      return String(row.assetId);
    case 'model':
      return row.model?.trim() || '—';
    case 'brand':
      return row.brand?.trim() || '—';
    case 'category':
      return row.category?.trim() || '—';
    case 'serial':
      return row.serialNum?.trim() || '—';
    case 'status':
      return formatStatusLabel(row.statusId);
    case 'handledBy':
      return row.handledBy?.trim() || '—';
    case 'handoverTo':
      return row.handoverTo?.trim() || '—';
    case 'location':
      return row.location?.trim() || '—';
    case 'history':
      return row.history?.trim() || '—';
    case 'request':
      return row.request?.trim() || '—';
    default:
      return '—';
  }
}

function resolveColumnLayouts(selected: ReportPdfColumn[]): ColumnLayout[] {
  const defs = REPORT_PDF_COLUMNS.filter((c) => selected.includes(c.key));
  const totalWeight = defs.reduce((sum, c) => sum + c.weight, 0);
  let x = TABLE_X;

  return defs.map((col, index) => {
    const w =
      index === defs.length - 1
        ? TABLE_X + TABLE_W - x
        : Math.floor((col.weight / totalWeight) * TABLE_W * 10) / 10;
    const layout = { key: col.key, label: col.label, x, w };
    x += w;
    return layout;
  });
}

function tableTopY(showMeta: boolean): { headerY: number; bodyY: number } {
  return showMeta ? { headerY: 92, bodyY: 99 } : { headerY: 76, bodyY: 83 };
}

function buildPageSchemas(
  pageIndex: number,
  showMeta: boolean,
  columns: ColumnLayout[],
  rowsOnPage: number,
  layout: TableLayout,
) {
  const prefix = `p${pageIndex}`;
  const { headerY, bodyY } = tableTopY(showMeta);
  const fields = [
    ...pageHeaderFields(prefix, 'ASSET INVENTORY REPORT', IT_DEPT_HEADER),
    T(`${prefix}_meta`, TABLE_X, 76, TABLE_W, showMeta ? 14 : 0, 8, { lineHeight: 1.25 }),
    T(`${prefix}_pageNo`, TABLE_X, 272, TABLE_W, 6, 8, { align: 'right' }),
    pageFooterField(prefix),
  ];

  for (const col of columns) {
    fields.push(
      T(`${prefix}_h_${col.key}`, col.x, headerY, col.w, HDR_H, HDR_FONT, {
        backgroundColor: TABLE_HDR_BG,
        align: 'center',
        markdown: true,
        content: boldContent(col.label),
      }),
    );
  }

  for (let row = 0; row < rowsOnPage; row++) {
    const y = bodyY + row * layout.rowHeight;
    for (const col of columns) {
      fields.push(
        T(`${prefix}_r${row}_${col.key}`, col.x, y, col.w, layout.rowHeight, layout.bodyFont, {
          align: 'left',
          lineHeight: col.key === 'history' ? 1.2 : 1.15,
          overflow: 'visible',
        }),
      );
    }
  }

  return fields;
}

function buildTemplate(
  rowCount: number,
  columns: ColumnLayout[],
  layout: TableLayout,
): Template {
  const totalPages = Math.max(1, Math.ceil(rowCount / layout.rowsPerPage));
  const schemas = Array.from({ length: totalPages }, (_, index) => {
    const rowsOnPage =
      rowCount === 0 && index === 0
        ? 1
        : index < totalPages - 1
          ? layout.rowsPerPage
          : ((rowCount - 1) % layout.rowsPerPage) + 1;
    return buildPageSchemas(index + 1, index === 0, columns, rowsOnPage, layout);
  });
  return { basePdf: BASE_PDF, schemas };
}

function buildInputs(
  rows: AssetReportRow[],
  filters: TechnicianReportPdfFilters,
  columns: ColumnLayout[],
  layout: TableLayout,
  logo: string,
): Record<string, string>[] {
  const generatedAt = new Date().toLocaleString('en-MY', { hour12: false });
  const totalPages = Math.max(1, Math.ceil(rows.length / layout.rowsPerPage));
  const input: Record<string, string> = {};

  for (let page = 0; page < totalPages; page++) {
    const prefix = `p${page + 1}`;
    const chunk = rows.slice(page * layout.rowsPerPage, (page + 1) * layout.rowsPerPage);

    input[`${prefix}_logo`] = logo;
    input[`${prefix}_genFooter`] = COMPUTER_GENERATED_FOOTER;
    input[`${prefix}_pageNo`] = `Page ${page + 1} of ${totalPages}`;

    if (page === 0) {
      input[`${prefix}_meta`] = [
        `Generated: ${generatedAt}`,
        `Total assets: ${rows.length}`,
        describeReportFilters(filters),
      ].join('\n');
    }

    chunk.forEach((row, rowIndex) => {
      for (const col of columns) {
        input[`${prefix}_r${rowIndex}_${col.key}`] = cellValue(row, col.key);
      }
    });

    if (chunk.length === 0 && page === 0) {
      input[`${prefix}_r0_${columns[0]?.key ?? 'id'}`] = 'No assets match the selected filters.';
    }
  }

  return [input];
}

export async function generateAssetReportPdfBase64(
  filters: TechnicianReportPdfFilters,
): Promise<{ base64: string; filename: string; count: number }> {
  const columns = resolveColumnLayouts(filters.columns);
  if (!columns.length) {
    throw new Error('Select at least one report column');
  }

  const layout = tableLayout(filters);
  const rows = await fetchFilteredAssetReportRows(filters);
  const stamp = new Date().toISOString().slice(0, 10);
  const logo = loadLogoBase64();
  const template = buildTemplate(rows.length, columns, layout);
  const pdf = await generate({
    template,
    inputs: buildInputs(rows, filters, columns, layout, logo),
    plugins: { text, image },
  });

  return {
    base64: Buffer.from(pdf).toString('base64'),
    filename: `nims-asset-report-${stamp}.pdf`,
    count: rows.length,
  };
}
