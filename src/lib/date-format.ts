/** Procurement / CSV date format: DDMMYY (e.g. 150126 = 15 Jan 2026). */
export const DATE_FORMAT_DDMMYY = 'DDMMYY' as const;

export const PURCHASE_DATE_COLUMNS = ['po_date', 'do_date', 'invoice_date'] as const;

const DDMMYY_RE = /^(\d{2})(\d{2})(\d{2})$/;

/** Strip separators; keep digits only. */
export function normalizeDdMmYyInput(raw: string): string {
  return raw.trim().replace(/\D/g, '');
}

/** Parse DDMMYY to ISO date YYYY-MM-DD for MySQL. Returns null if invalid. */
export function parseDdMmYyToIso(raw: string): string | null {
  const digits = normalizeDdMmYyInput(raw);
  if (!digits) return null;

  const m = digits.match(DDMMYY_RE);
  if (!m) return null;

  const day = Number(m[1]);
  const month = Number(m[2]);
  const year = 2000 + Number(m[3]);

  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }

  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** Format ISO YYYY-MM-DD (or Date) to DDMMYY for display / CSV. */
export function formatIsoToDdMmYy(iso: string | Date | null | undefined): string | null {
  if (iso == null) return null;

  let year: number;
  let month: number;
  let day: number;

  if (iso instanceof Date) {
    if (Number.isNaN(iso.getTime())) return null;
    year = iso.getFullYear();
    month = iso.getMonth() + 1;
    day = iso.getDate();
  } else {
    const trimmed = iso.trim().slice(0, 10);
    const m = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return null;
    year = Number(m[1]);
    month = Number(m[2]);
    day = Number(m[3]);
  }

  return `${String(day).padStart(2, '0')}${String(month).padStart(2, '0')}${String(year % 100).padStart(2, '0')}`;
}

export function isValidDdMmYy(raw: string): boolean {
  return parseDdMmYyToIso(raw) !== null;
}
