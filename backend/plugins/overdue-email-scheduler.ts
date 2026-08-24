import { definePlugin } from 'nitro';
import { startOverdueReturnEmailScheduler } from '../server/jobs/overdue-return-email-scheduler.server';

export default definePlugin(() => {
  startOverdueReturnEmailScheduler();
});
