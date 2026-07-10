import { createFileRoute } from '@tanstack/react-router';
import { handleRequestAction } from '@/server/api-handlers.server';

export const Route = createFileRoute('/api/v1/requests/pool/mark')({
  server: {
    handlers: {
      POST: ({ request }) => handleRequestAction(request, 'pool-mark'),
    },
  },
});
