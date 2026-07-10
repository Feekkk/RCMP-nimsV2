import { createFileRoute } from '@tanstack/react-router';
import { handleRefresh } from '@/server/api-handlers.server';

export const Route = createFileRoute('/api/v1/auth/refresh')({
  server: {
    handlers: {
      POST: ({ request }) => handleRefresh(request),
    },
  },
});
