import { createFileRoute } from '@tanstack/react-router';
import { MicrosoftCallbackPage } from '@/auth/microsoft-callback-page';

export const Route = createFileRoute('/api/auth/microsoft/callback')({
  head: () => ({
    meta: [{ title: 'Microsoft sign-in | NIMS' }],
  }),
  component: MicrosoftCallbackPage,
});
