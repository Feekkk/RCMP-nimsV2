import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/api/cron/overdue-return-emails')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.CRON_SECRET?.trim();
        const auth = request.headers.get('authorization')?.trim();
        if (!secret || auth !== `Bearer ${secret}`) {
          return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { runOverdueReturnEmailJob } = await import('@/server/overdue-return-email-job.server');
        const result = await runOverdueReturnEmailJob({ skipTimeCheck: true });
        return Response.json(result);
      },
    },
  },
});
