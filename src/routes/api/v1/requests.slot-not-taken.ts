import { createFileRoute } from '@tanstack/react-router';
import { handleRequestAction } from '@/server/api-handlers.server';

export const Route = createFileRoute('/api/v1/requests/slot-not-taken')({
  server: {
    handlers: {
      POST: ({ request }) => handleRequestAction(request, 'slot-not-taken'),
    },
  },
});
