import { createFileRoute } from '@tanstack/react-router';
import { handleMe } from '@/server/api-handlers.server';

export const Route = createFileRoute('/api/v1/auth/me')({
  server: {
    handlers: {
      GET: ({ request }) => handleMe(request),
    },
  },
});
