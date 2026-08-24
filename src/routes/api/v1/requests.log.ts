import { createFileRoute } from '@tanstack/react-router';
import { handleRequestLog } from '@backend/server/api/api-handlers.server';

export const Route = createFileRoute('/api/v1/requests/log')({
  server: {
    handlers: {
      GET: ({ request }) => handleRequestLog(request),
    },
  },
});
