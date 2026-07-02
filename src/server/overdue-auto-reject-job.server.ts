import { AUTO_REJECT_REASON, type OverdueAutoRejectJobResult } from '@/lib/overdue-auto-reject-types';
import { isOverdueEmailScheduleTime } from '@/lib/overdue-email-schedule';
import {
  listOverdueAutoRejectEmailRetries,
  listOverdueRequestsForAutoReject,
  logOverdueAutoReject,
  markOverdueAutoRejectEmailSent,
  resolveAutoRejectActorUserId,
} from '@/server/overdue-auto-reject-repo.server';
import { resolveOverdueEmailRunDate } from '@/server/overdue-return-email-repo.server';

export type RunOverdueAutoRejectJobOptions = {
  runDate?: string;
  skipTimeCheck?: boolean;
};

async function sendRejectEmail(requestId: number): Promise<void> {
  const { sendRequestRejectEmail } = await import('@/server/request-reject-email.server');
  await sendRequestRejectEmail(requestId);
}

export async function runOverdueAutoRejectJob(
  options: RunOverdueAutoRejectJobOptions = {},
): Promise<OverdueAutoRejectJobResult> {
  const runDate = resolveOverdueEmailRunDate(options.runDate);

  if (!options.skipTimeCheck && !isOverdueEmailScheduleTime()) {
    return {
      runDate,
      rejected: 0,
      emailed: 0,
      failed: 0,
      skippedReason: 'Outside scheduled send window (default 09:00 in OVERDUE_EMAIL_TZ)',
      details: [],
    };
  }

  const details: OverdueAutoRejectJobResult['details'] = [];
  let rejected = 0;
  let emailed = 0;
  let failed = 0;

  const actorUserId = await resolveAutoRejectActorUserId();
  const { rejectUserRequest } = await import('@/server/request-repo.server');

  for (const requestId of await listOverdueRequestsForAutoReject(runDate)) {
    try {
      await rejectUserRequest({
        requestId,
        rejectedBy: actorUserId,
        rejectionReason: AUTO_REJECT_REASON,
      });
      rejected += 1;

      try {
        await sendRejectEmail(requestId);
        await logOverdueAutoReject(requestId, runDate, true);
        emailed += 1;
        details.push({ requestId, status: 'rejected' });
      } catch (emailErr) {
        const error = emailErr instanceof Error ? emailErr.message : 'Rejection email failed';
        await logOverdueAutoReject(requestId, runDate, false, error);
        details.push({ requestId, status: 'email_failed', error });
      }
    } catch (e) {
      failed += 1;
      details.push({
        requestId,
        status: 'failed',
        error: e instanceof Error ? e.message : 'Auto-reject failed',
      });
    }
  }

  for (const requestId of await listOverdueAutoRejectEmailRetries()) {
    try {
      await sendRejectEmail(requestId);
      await markOverdueAutoRejectEmailSent(requestId);
      emailed += 1;
      details.push({ requestId, status: 'rejected' });
    } catch (e) {
      failed += 1;
      const error = e instanceof Error ? e.message : 'Rejection email retry failed';
      await logOverdueAutoReject(requestId, runDate, false, error);
      details.push({ requestId, status: 'email_failed', error });
    }
  }

  return { runDate, rejected, emailed, failed, details };
}
