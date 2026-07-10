import { createFileRoute } from '@tanstack/react-router';
import { handleRequestAction, handleUserRequestAction } from '@/server/api-handlers.server';

export const Route = createFileRoute('/api/v1/requests/checkout')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const contentType = request.headers.get('content-type') ?? '';
        const clone = request.clone();
        const body = (await clone.json().catch(() => ({}))) as Record<string, unknown>;
        if (body.assignmentId != null) {
          return handleRequestAction(request, 'checkout-staff');
        }
        return handleUserRequestAction(request, 'checkout');
      },
    },
  },
});
