import { createFileRoute } from '@tanstack/react-router';
import { handleHealth } from '@backend/server/api/api-handlers.server';

export const Route = createFileRoute('/api/v1/health')({
  server: {
    handlers: {
      GET: () => handleHealth(),
    },
  },
});
