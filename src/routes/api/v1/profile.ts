import { createFileRoute } from '@tanstack/react-router';
import { handleGetProfile, handlePatchProfile } from '@/server/api-handlers.server';

export const Route = createFileRoute('/api/v1/profile')({
  server: {
    handlers: {
      GET: ({ request }) => handleGetProfile(request),
      PATCH: ({ request }) => handlePatchProfile(request),
    },
  },
});
