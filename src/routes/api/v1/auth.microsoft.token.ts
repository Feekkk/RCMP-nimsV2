import { createFileRoute } from '@tanstack/react-router';
import { handleMicrosoftToken } from '@/server/api-handlers.server';

export const Route = createFileRoute('/api/v1/auth/microsoft/token')({
  server: {
    handlers: {
      POST: ({ request }) => handleMicrosoftToken(request),
    },
  },
});
