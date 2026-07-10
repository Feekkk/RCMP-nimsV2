import { createFileRoute } from '@tanstack/react-router';
import { handleDashboard } from '@/server/api-handlers.server';

export const Route = createFileRoute('/api/v1/dashboard')({
  server: {
    handlers: {
      GET: ({ request }) => handleDashboard(request),
    },
  },
});
