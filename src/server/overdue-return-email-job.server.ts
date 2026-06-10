import type { OverdueReturnEmailJobResult } from '@/lib/overdue-return-email-types';
import { isOverdueEmailScheduleTime } from '@/lib/overdue-email-schedule';
import {
  listOverdueRequestIdsForEmail,
  resolveOverdueEmailRunDate,
} from '@/server/overdue-return-email-repo.server';

export type RunOverdueReturnEmailJobOptions = {
  /** ISO date (YYYY-MM-DD) used for eligibility and deduplication; defaults to today in OVERDUE_EMAIL_TZ. */
  runDate?: string;
  /** Skip the 9:00 schedule gate (cron endpoint / manual runs). */
  skipTimeCheck?: boolean;
};

export async function runOverdueReturnEmailJob(
  options: RunOverdueReturnEmailJobOptions = {},
): Promise<OverdueReturnEmailJobResult> {
  const runDate = resolveOverdueEmailRunDate(options.runDate);

  if (!options.skipTimeCheck && !isOverdueEmailScheduleTime()) {
    return {
      runDate,
      sent: 0,
      failed: 0,
      skippedReason: 'Outside scheduled send window (default 09:00 in OVERDUE_EMAIL_TZ)',
      details: [],
    };
  }

  const requestIds = await listOverdueRequestIdsForEmail(runDate);
  const details: OverdueReturnEmailJobResult['details'] = [];
  let sent = 0;
  let failed = 0;

  const { sendOverdueReturnEmail } = await import('@/server/overdue-return-email.server');

  for (const requestId of requestIds) {
    try {
      await sendOverdueReturnEmail(requestId, runDate);
      sent += 1;
      details.push({ requestId, status: 'sent' });
    } catch (e) {
      failed += 1;
      details.push({
        requestId,
        status: 'failed',
        error: e instanceof Error ? e.message : 'Send failed',
      });
    }
  }

  return { runDate, sent, failed, details };
}
