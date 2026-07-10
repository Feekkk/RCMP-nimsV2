import { createFileRoute } from '@tanstack/react-router';
import { handlePendingRequests } from '@/server/api-handlers.server';

export const Route = createFileRoute('/api/v1/requests/pending')({
  server: {
    handlers: {
      GET: ({ request }) => handlePendingRequests(request),
    },
  },
});
