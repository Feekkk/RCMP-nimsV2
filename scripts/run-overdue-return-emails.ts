import { config } from 'dotenv';
import { resolve } from 'node:path';

config({ path: resolve(process.cwd(), '.env') });
config({ path: resolve(process.cwd(), '.env.local'), override: true });

const runDate = process.argv.find((a) => a.startsWith('--date='))?.slice('--date='.length);

async function main() {
  const { runOverdueReturnEmailJob } = await import(
    '../src/server/overdue-return-email-job.server'
  );
  const { runOverdueAutoRejectJob } = await import(
    '../src/server/overdue-auto-reject-job.server'
  );

  const overdueReturnEmails = await runOverdueReturnEmailJob({
    runDate,
    skipTimeCheck: true,
  });
  const overdueAutoReject = await runOverdueAutoRejectJob({
    runDate,
    skipTimeCheck: true,
  });

  console.log(JSON.stringify({ overdueReturnEmails, overdueAutoReject }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
