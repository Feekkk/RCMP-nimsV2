import { definePlugin } from 'nitro';
import { startOverdueReturnEmailScheduler } from '../../src/server/overdue-return-email-scheduler.server';

export default definePlugin(() => {
  startOverdueReturnEmailScheduler();
});
