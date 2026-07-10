import { createFileRoute } from '@tanstack/react-router';
import { handleListStaff } from '@/server/api-handlers.server';

export const Route = createFileRoute('/api/v1/staff/')({
  server: {
    handlers: {
      GET: ({ request }) => handleListStaff(request),
    },
  },
});
