import { createFileRoute } from '@tanstack/react-router';
import { handleRequestAction, handleUserRequestAction } from '@/server/api-handlers.server';

export const Route = createFileRoute('/api/v1/requests/return')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const clone = request.clone();
        const body = (await clone.json().catch(() => ({}))) as Record<string, unknown>;
        if (body.assignmentId != null) {
          return handleRequestAction(request, 'return-staff');
        }
        return handleUserRequestAction(request, 'return');
      },
    },
  },
});
