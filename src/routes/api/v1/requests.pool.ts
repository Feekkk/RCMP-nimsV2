import { createFileRoute } from '@tanstack/react-router';
import { handleRequestPool } from '@backend/server/api/api-handlers.server';

export const Route = createFileRoute('/api/v1/requests/pool')({
  server: {
    handlers: {
      GET: ({ request }) => handleRequestPool(request),
    },
  },
});
