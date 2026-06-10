import {
  getOverdueEmailScheduleConfig,
  getTodayIsoInTimeZone,
  isOverdueEmailScheduleTime,
} from '@/lib/overdue-email-schedule';
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
    const result = await runOverdueReturnEmailJob({ runDate, skipTimeCheck: true });
    console.info(
      `[overdue-email] Job finished for ${result.runDate}: sent=${result.sent}, failed=${result.failed}`,
    );
  } catch (e) {
    lastRunDateKey = null;
    console.error('[overdue-email] Job failed:', e);
  } finally {
    running = false;
  }
}
