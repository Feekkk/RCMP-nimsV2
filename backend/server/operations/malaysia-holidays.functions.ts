import { createServerFn } from '@tanstack/react-start';
import { sessionMiddleware } from '@backend/server/core/auth-middleware';

export const getMalaysiaHolidaysFn = createServerFn({ method: 'POST' })
  .middleware([sessionMiddleware])
  .inputValidator((data?: { years?: number[] }) => {
    const now = new Date().getFullYear();
    const years = (data?.years ?? [now, now + 1])
      .filter((year) => Number.isInteger(year) && year >= 2000 && year <= 2100)
      .slice(0, 3);
    return { years: years.length > 0 ? years : [now, now + 1] };
  })
  .handler(async ({ data }) => {
    const { fetchMalaysiaHolidaysForYears } = await import(
      '@backend/server/operations/malaysia-holidays.server'
    );
    return fetchMalaysiaHolidaysForYears(data.years);
  });
