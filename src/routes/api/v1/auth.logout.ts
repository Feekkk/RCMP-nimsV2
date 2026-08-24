import { createFileRoute } from '@tanstack/react-router';
import { handleLogout } from '@backend/server/api/api-handlers.server';

export const Route = createFileRoute('/api/v1/auth/logout')({
  server: {
    handlers: {
      POST: ({ request }) => handleLogout(request),
    },
  },
});
