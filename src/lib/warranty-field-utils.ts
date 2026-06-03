export const WARRANTY_FIELD_COLUMNS = [
  'warranty_start_date',
  'warranty_end_date',
  'warranty_remarks',
] as const;

export type WarrantyInput = {
  startDate: string;
  endDate: string;
  remarks?: string | null;
};
import type { BulkImportRowError } from '@/hooks/bulkImport';
import { parseOptionalDate } from '@/lib/purchase-field-utils';

export type WarrantyFormState = {
  startDate: string;
  endDate: string;
  remarks: string;
};

export function emptyWarrantyFormState(): WarrantyFormState {
  return { startDate: '', endDate: '', remarks: '' };
}

export function warrantyFormToInput(state: WarrantyFormState): WarrantyInput | null {
  const start = state.startDate.trim();
  const end = state.endDate.trim();
  if (!start && !end && !state.remarks.trim()) return null;
  if (!start || !end) return null;
  return {
    startDate: start,
    endDate: end,
    remarks: state.remarks.trim() || null,
  };
}

export function parseWarrantyFromRow(
  row: string[],
  col: Map<string, number>,
  rowNum: number,
  errors: BulkImportRowError[],
): WarrantyInput | undefined {
  const startRaw = row[col.get('warranty_start_date') ?? -1]?.trim() ?? '';
  const endRaw = row[col.get('warranty_end_date') ?? -1]?.trim() ?? '';
  const remarks = row[col.get('warranty_remarks') ?? -1]?.trim() || null;

  if (!startRaw && !endRaw && !remarks) return undefined;

  if (!startRaw || !endRaw) {
    errors.push({
      row: rowNum,
      message: 'warranty_start_date and warranty_end_date must both be set when adding warranty',
    });
    return undefined;
  }

  const startDate = parseOptionalDate(startRaw, 'warranty_start_date', rowNum, errors);
  const endDate = parseOptionalDate(endRaw, 'warranty_end_date', rowNum, errors);
  if (!startDate || !endDate) return undefined;

  return { startDate, endDate, remarks };
}
