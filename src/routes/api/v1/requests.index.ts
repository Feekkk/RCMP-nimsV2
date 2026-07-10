import { createFileRoute } from '@tanstack/react-router';
import { handleSubmitRequest, handleUserRequests } from '@/server/api-handlers.server';

export const Route = createFileRoute('/api/v1/requests/')({
  server: {
    handlers: {
      GET: ({ request }) => handleUserRequests(request),
      POST: ({ request }) => handleSubmitRequest(request),
    },
  },
});
