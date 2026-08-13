import {
  getOverdueEmailScheduleConfig,
  getTodayIsoInTimeZone,
  isOverdueEmailScheduleTime,
} from '@/lib/overdue-email-schedule';
import { runOverdueAutoRejectJob } from '@/server/overdue-auto-reject-job.server';
import { runOverdueReturnEmailJob } from '@/server/overdue-return-email-job.server';

let started = false;
let running = false;
let lastRunDateKey: string | null = null;

/** In-process daily trigger — enable with OVERDUE_EMAIL_SCHEDULER=true (dev / long-running Node). */
export function startOverdueReturnEmailScheduler(): void {
  if (started) return;
  const config = getOverdueEmailScheduleConfig();
  if (!config.enabled) return;

  started = true;
  console.info(
    `[overdue-email] Scheduler enabled — daily at ${String(config.hour).padStart(2, '0')}:${String(config.minute).padStart(2, '0')} ${config.tz}`,
  );

  setInterval(() => {
    void tickOverdueReturnEmailScheduler();
  }, 60_000);

  void tickOverdueReturnEmailScheduler();
}

async function tickOverdueReturnEmailScheduler(): Promise<void> {
  const config = getOverdueEmailScheduleConfig();
  if (!config.enabled) return;
  if (!isOverdueEmailScheduleTime()) return;

  const runDate = getTodayIsoInTimeZone(config.tz);
  if (lastRunDateKey === runDate || running) return;

  running = true;
  lastRunDateKey = runDate;
  try {
    const emailResult = await runOverdueReturnEmailJob({ runDate, skipTimeCheck: true });
    const autoRejectResult = await runOverdueAutoRejectJob({ runDate, skipTimeCheck: true });
    console.info(
      `[overdue-email] Job finished for ${emailResult.runDate}: sent=${emailResult.sent}, failed=${emailResult.failed}`,
    );
    console.info(
      `[overdue-auto-reject] Job finished for ${autoRejectResult.runDate}: rejected=${autoRejectResult.rejected}, emailed=${autoRejectResult.emailed}, failed=${autoRejectResult.failed}`,
    );
  } catch (e) {
    lastRunDateKey = null;
    console.error('[overdue-email] Job failed:', e);
  } finally {
    running = false;
  }
}
