import { createFileRoute } from '@tanstack/react-router';
import { handleAssetLookup } from '@/server/api-handlers.server';

export const Route = createFileRoute('/api/v1/assets/lookup')({
  server: {
    handlers: {
      GET: ({ request }) => handleAssetLookup(request),
    },
  },
});
