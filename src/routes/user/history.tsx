import { createFileRoute } from '@tanstack/react-router';
import { UserRequestHistoryPage } from '@/user/history';

export const Route = createFileRoute('/user/history')({
  head: () => ({
    meta: [
      { title: 'Request history | NIMS' },
      { name: 'description', content: 'View your equipment request history.' },
    ],
  }),
  component: UserRequestHistoryPage,
});
