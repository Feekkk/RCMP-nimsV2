import type { DashboardHoliday } from '@shared/lib/dashboard-schema';

const HOLIDAY_API = 'https://malaysia-holiday.dydxsoft.my/api/v1/holidays';
const CAMPUS_STATE = 'PRK';
const CACHE_TTL_MS = 12 * 60 * 60 * 1000;
const FETCH_TIMEOUT_MS = 8000;

type HolidayCacheEntry = { at: number; holidays: DashboardHoliday[] };

const yearCache = new Map<string, HolidayCacheEntry>();

type HolidayApiItem = {
  name?: unknown;
  date?: unknown;
};

type HolidayApiResponse = {
  data?: unknown;
};

function isIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function parseHolidays(payload: HolidayApiResponse): DashboardHoliday[] {
  if (!Array.isArray(payload.data)) return [];

  const holidays: DashboardHoliday[] = [];
  for (const item of payload.data as HolidayApiItem[]) {
    const name = typeof item.name === 'string' ? item.name.trim() : '';
    const date = typeof item.date === 'string' ? item.date : '';
    if (!name || !isIsoDate(date)) continue;
    holidays.push({ date, name });
  }
  return holidays;
}

async function fetchHolidaysForYear(year: number): Promise<DashboardHoliday[]> {
  const key = `${CAMPUS_STATE}:${year}`;
  const cached = yearCache.get(key);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return cached.holidays;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const url = `${HOLIDAY_API}?year=${year}&state=${CAMPUS_STATE}`;
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) {
      return cached?.holidays ?? [];
    }

    const payload = (await response.json()) as HolidayApiResponse;
    const holidays = parseHolidays(payload);
    yearCache.set(key, { at: Date.now(), holidays });
    return holidays;
  } catch {
    return cached?.holidays ?? [];
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchMalaysiaHolidaysForYears(years: number[]): Promise<DashboardHoliday[]> {
  const unique = [...new Set(years.filter((year) => year >= 2000 && year <= 2100))];
  const batches = await Promise.all(unique.map((year) => fetchHolidaysForYear(year)));
  return batches.flat();
}

export async function fetchMalaysiaHolidaysForCalendar(
  year: number,
  month: number,
): Promise<DashboardHoliday[]> {
  const years = new Set([year]);
  if (month === 1) years.add(year - 1);
  if (month === 12) years.add(year + 1);

  const batches = await Promise.all([...years].map((y) => fetchHolidaysForYear(y)));
  return batches.flat();
}
