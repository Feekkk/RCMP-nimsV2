import { createFileRoute } from '@tanstack/react-router';
import { handleRequestAction } from '@backend/server/api/api-handlers.server';

export const Route = createFileRoute('/api/v1/requests/slot-unavailable')({
  server: {
    handlers: {
      POST: ({ request }) => handleRequestAction(request, 'slot-unavailable'),
    },
  },
});
