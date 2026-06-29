/** Compact procurement / CSV date format (e.g. 150126 = 15 Jan 2026). */
export const DATE_FORMAT_DDMMYY = 'DDMMYY' as const;

/** Separated date format (e.g. 15-01-26 or 1/2/3 = 15 Jan 2026 / 1 Feb 2003). */
export const DATE_FORMAT_DD_MM_YY = 'DD/MM/YY' as const;

/** Shown in bulk import and validation messages. */
export const IMPORT_DATE_FORMAT_HINT =
  `${DATE_FORMAT_DD_MM_YY} (e.g. 1/2/2003, 1/2/3, 15-01-26) or ${DATE_FORMAT_DDMMYY} (e.g. 150126)` as const;

export const PURCHASE_DATE_COLUMNS = ['po_date', 'do_date', 'invoice_date'] as const;

const DDMMYY_RE = /^(\d{2})(\d{2})(\d{2})$/;
const DDMMyyyy_RE = /^(\d{2})(\d{2})(\d{4})$/;
const SEPARATED_DATE_RE = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{1,4})$/;
const ISO_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Strip separators; keep digits only. */
export function normalizeDdMmYyInput(raw: string): string {
  return raw.trim().replace(/\D/g, '');
}

function toIsoDate(year: number, month: number, day: number): string | null {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }

  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function parseSeparatedDate(raw: string): string | null {
  const m = raw.trim().match(SEPARATED_DATE_RE);
  if (!m) return null;

  const day = Number(m[1]);
  const month = Number(m[2]);
  let year = Number(m[3]);
  if (year < 100) year = 2000 + year;

  return toIsoDate(year, month, day);
}

function parseDigitDate(digits: string): string | null {
  if (!digits) return null;

  const compact6 = digits.match(DDMMYY_RE);
  if (compact6) {
    return toIsoDate(2000 + Number(compact6[3]), Number(compact6[2]), Number(compact6[1]));
  }

  const compact8 = digits.match(DDMMyyyy_RE);
  if (compact8) {
    return toIsoDate(Number(compact8[3]), Number(compact8[2]), Number(compact8[1]));
  }

  return null;
}

/** Parse DD-MM-YY, DD/MM/YY, DD.MM.YY, DDMMyyyy, or DDMMYY to ISO YYYY-MM-DD. */
export function parseDdMmYyToIso(raw: string): string | null {
  const val = raw.trim();
  if (!val) return null;

  if (ISO_DATE_RE.test(val)) return val;

  const separated = parseSeparatedDate(val);
  if (separated) return separated;

  return parseDigitDate(normalizeDdMmYyInput(val));
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
    const m = trimmed.match(ISO_DATE_RE);
    if (!m) return null;
    year = Number(m[1]);
    month = Number(m[2]);
    day = Number(m[3]);
  }

  return `${String(day).padStart(2, '0')}${String(month).padStart(2, '0')}${String(year % 100).padStart(2, '0')}`;
}

/** Format ISO to DD-MM-YY for CSV-friendly display. */
export function formatIsoToDdMmYySeparated(iso: string | Date | null | undefined): string | null {
  const compact = formatIsoToDdMmYy(iso);
  if (!compact || compact.length !== 6) return null;
  return `${compact.slice(0, 2)}-${compact.slice(2, 4)}-${compact.slice(4, 6)}`;
}

export function isValidDdMmYy(raw: string): boolean {
  return parseDdMmYyToIso(raw) !== null;
}

/** Accept ISO (YYYY-MM-DD) or import formats; returns ISO for MySQL. */
export function normalizeToIsoDate(raw: string): string | null {
  const val = raw.trim();
  if (!val) return null;
  return parseDdMmYyToIso(val);
}

export function isoToLocalDate(iso: string): Date | undefined {
  const normalized = normalizeToIsoDate(iso);
  if (!normalized) return undefined;
  const [y, m, d] = normalized.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) {
    return undefined;
  }
  return date;
}

export function localDateToIso(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function formatDateLabel(iso: string): string {
  const date = isoToLocalDate(iso);
  if (!date) return iso;
  return date.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/** Human-readable label for procurement dates (DDMMYY, DD/MM/YY, or ISO). */
export function formatPurchaseDateLabel(raw: string | null | undefined): string | null {
  if (raw == null || !raw.trim()) return null;
  const iso = normalizeToIsoDate(raw);
  return iso ? formatDateLabel(iso) : raw.trim();
}

function formatDurationSince(start: Date, end: Date): string {
  let years = end.getFullYear() - start.getFullYear();
  let months = end.getMonth() - start.getMonth();
  if (end.getDate() < start.getDate()) months--;
  if (months < 0) {
    years--;
    months += 12;
  }

  if (years < 0) return '—';

  const parts: string[] = [];
  if (years > 0) parts.push(`${years} year${years === 1 ? '' : 's'}`);
  if (months > 0) parts.push(`${months} month${months === 1 ? '' : 's'}`);

  if (parts.length === 0) {
    const msPerDay = 1000 * 60 * 60 * 24;
    const diffDays = Math.max(0, Math.floor((end.getTime() - start.getTime()) / msPerDay));
    if (diffDays === 0) return 'Less than 1 day old';
    return diffDays === 1 ? '1 day old' : `${diffDays} days old`;
  }

  return `${parts.join(', ')} old`;
}

/** Asset age from PO date, or from registration date when PO date is missing. */
export function formatAssetAge(
  poDate: string | null | undefined,
  createdAt: string | null | undefined,
): string | null {
  let start: Date | undefined;
  let basisLabel: string | undefined;

  if (poDate?.trim()) {
    const iso = normalizeToIsoDate(poDate);
    const parsed = iso ? isoToLocalDate(iso) : undefined;
    if (parsed) {
      start = parsed;
      basisLabel = 'since PO date';
    }
  }

  if (!start && createdAt) {
    const registered = new Date(createdAt);
    if (!Number.isNaN(registered.getTime())) {
      start = new Date(registered.getFullYear(), registered.getMonth(), registered.getDate());
      basisLabel = 'registered in system';
    }
  }

  if (!start || !basisLabel) return null;

  const today = new Date();
  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return `${formatDurationSince(start, end)} (${basisLabel})`;
}
