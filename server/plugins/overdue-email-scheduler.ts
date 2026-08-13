import { definePlugin } from 'nitro';
import { startOverdueReturnEmailScheduler } from '../../src/server/jobs/overdue-return-email-scheduler.server';

export default definePlugin(() => {
  startOverdueReturnEmailScheduler();
});
