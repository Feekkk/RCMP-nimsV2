import { createFileRoute } from '@tanstack/react-router';
import { handleDevLogin } from '@/server/api-handlers.server';

export const Route = createFileRoute('/api/v1/auth/dev-login')({
  server: {
    handlers: {
      POST: ({ request }) => handleDevLogin(request),
    },
  },
});
