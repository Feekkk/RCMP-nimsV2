import { createFileRoute } from '@tanstack/react-router';
import { handleRequestAction } from '@backend/server/api/api-handlers.server';

export const Route = createFileRoute('/api/v1/requests/pool/remove')({
  server: {
    handlers: {
      POST: ({ request }) => handleRequestAction(request, 'pool-remove'),
    },
  },
});
