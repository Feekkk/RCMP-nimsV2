import { IMPORT_DATE_FORMAT_HINT, parseDdMmYyToIso } from '@/lib/date-format';
import type { PurchaseFields } from '@/lib/inventory-schema';

export { DATE_FORMAT_DDMMYY, IMPORT_DATE_FORMAT_HINT, PURCHASE_DATE_COLUMNS } from '@/lib/date-format';

export function parseOptionalDate(
  raw: string,
  column: string,
  rowNum: number,
  errors: { row: number; message: string }[],
): string | null {
  const val = raw.trim();
  if (!val) return null;

  const iso = parseDdMmYyToIso(val);
  if (!iso) {
    errors.push({
      row: rowNum,
      message: `Invalid ${column} (use ${IMPORT_DATE_FORMAT_HINT})`,
    });
    return null;
  }
  return iso;
}

export function parseOptionalDecimal(
  raw: string,
  column: string,
  rowNum: number,
  errors: { row: number; message: string }[],
): number | null {
  const val = raw.trim();
  if (!val) return null;
  const n = Number(val);
  if (Number.isNaN(n)) {
    errors.push({ row: rowNum, message: `Invalid ${column}` });
    return null;
  }
  return n;
}

export function parsePurchaseFromRow(
  row: string[],
  col: Map<string, number>,
  rowNum: number,
  errors: { row: number; message: string }[],
): PurchaseFields {
  const poDate = parseOptionalDate(row[col.get('po_date')!] ?? '', 'po_date', rowNum, errors);
  const doDate = parseOptionalDate(row[col.get('do_date')!] ?? '', 'do_date', rowNum, errors);
  const invoiceDate = parseOptionalDate(row[col.get('invoice_date')!] ?? '', 'invoice_date', rowNum, errors);
  const purchaseCost = parseOptionalDecimal(
    row[col.get('purchase_cost')!] ?? '',
    'purchase_cost',
    rowNum,
    errors,
  );

  return {
    poDate,
    poNum: (row[col.get('po_num')!] ?? '').trim() || null,
    doDate,
    doNum: (row[col.get('do_num')!] ?? '').trim() || null,
    invoiceDate,
    invoiceNum: (row[col.get('invoice_num')!] ?? '').trim() || null,
    purchaseCost,
  };
}

export function emptyPurchaseFormState() {
  return {
    poDate: '',
    poNum: '',
    doDate: '',
    doNum: '',
    invoiceDate: '',
    invoiceNum: '',
    purchaseCost: '',
  };
}

export type PurchaseFormState = ReturnType<typeof emptyPurchaseFormState>;

function formDateToIso(raw: string): string | null {
  const val = raw.trim();
  if (!val) return null;
  return parseDdMmYyToIso(val);
}

export function purchaseFormToInput(state: PurchaseFormState): PurchaseFields {
  return {
    poDate: formDateToIso(state.poDate),
    poNum: state.poNum.trim() || null,
    doDate: formDateToIso(state.doDate),
    doNum: state.doNum.trim() || null,
    invoiceDate: formDateToIso(state.invoiceDate),
    invoiceNum: state.invoiceNum.trim() || null,
    purchaseCost: state.purchaseCost.trim() ? Number(state.purchaseCost) : null,
  };
}

export function purchaseSqlParams(p: PurchaseFields) {
  return [
    p.poDate ?? null,
    p.poNum ?? null,
    p.doDate ?? null,
    p.doNum ?? null,
    p.invoiceDate ?? null,
    p.invoiceNum ?? null,
    p.purchaseCost ?? null,
  ];
}
