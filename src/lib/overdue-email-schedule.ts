export const DEFAULT_OVERDUE_EMAIL_TZ = 'Asia/Kuala_Lumpur';
export const DEFAULT_OVERDUE_EMAIL_HOUR = 9;

export type OverdueEmailScheduleConfig = {
  tz: string;
  hour: number;
  minute: number;
  enabled: boolean;
};

export function getOverdueEmailScheduleConfig(): OverdueEmailScheduleConfig {
  const hour = Number(process.env.OVERDUE_EMAIL_HOUR ?? DEFAULT_OVERDUE_EMAIL_HOUR);
  const minute = Number(process.env.OVERDUE_EMAIL_MINUTE ?? 0);
  return {
    tz: process.env.OVERDUE_EMAIL_TZ ?? DEFAULT_OVERDUE_EMAIL_TZ,
    hour: Number.isFinite(hour) ? hour : DEFAULT_OVERDUE_EMAIL_HOUR,
    minute: Number.isFinite(minute) ? minute : 0,
    enabled: process.env.OVERDUE_EMAIL_SCHEDULER === 'true',
  };
}

type ClockParts = {
  hour: number;
  minute: number;
};

function parseClockPart(parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes): number {
  const raw = parts.find((p) => p.type === type)?.value ?? '0';
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
}

export function getClockPartsInTimeZone(timeZone: string, now = new Date()): ClockParts {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  }).formatToParts(now);

  let hour = parseClockPart(parts, 'hour');
  const minute = parseClockPart(parts, 'minute');
  if (hour === 24) hour = 0;

  return { hour, minute };
}

/** ISO date (YYYY-MM-DD) for `now` in the given IANA timezone. */
export function getTodayIsoInTimeZone(timeZone: string, now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

export function isOverdueEmailScheduleTime(now = new Date()): boolean {
  const { tz, hour, minute } = getOverdueEmailScheduleConfig();
  const clock = getClockPartsInTimeZone(tz, now);
  return clock.hour === hour && clock.minute === minute;
}
