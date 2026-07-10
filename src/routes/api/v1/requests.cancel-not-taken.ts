import { createFileRoute } from '@tanstack/react-router';
import { handleRequestAction } from '@/server/api-handlers.server';

export const Route = createFileRoute('/api/v1/requests/cancel-not-taken')({
  server: {
    handlers: {
      POST: ({ request }) => handleRequestAction(request, 'cancel-not-taken'),
    },
  },
});
