import { createFileRoute } from '@tanstack/react-router';
import { handleListAssets } from '@backend/server/api/api-handlers.server';

export const Route = createFileRoute('/api/v1/assets/')({
  server: {
    handlers: {
      GET: ({ request }) => handleListAssets(request),
    },
  },
});
