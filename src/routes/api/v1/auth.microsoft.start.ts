import { createFileRoute } from '@tanstack/react-router';
import { handleMicrosoftStart } from '@/server/api-handlers.server';

export const Route = createFileRoute('/api/v1/auth/microsoft/start')({
  server: {
    handlers: {
      POST: ({ request }) => handleMicrosoftStart(request),
    },
  },
});
