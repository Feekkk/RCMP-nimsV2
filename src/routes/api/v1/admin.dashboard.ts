import { createFileRoute } from '@tanstack/react-router';
import { handleAdminDashboard } from '@/server/api-handlers.server';

export const Route = createFileRoute('/api/v1/admin/dashboard')({
  server: {
    handlers: {
      GET: ({ request }) => handleAdminDashboard(request),
    },
  },
});
