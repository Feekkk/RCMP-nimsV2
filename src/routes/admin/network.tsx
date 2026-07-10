import { createFileRoute } from '@tanstack/react-router';
import { AdminNetworkPage } from '@/admin/network';

export const Route = createFileRoute('/admin/network')({
  head: () => ({
    meta: [
      { title: 'Network equipment | NIMS Admin' },
      { name: 'description', content: 'Administrator overview of network equipment inventory.' },
    ],
  }),
  component: AdminNetworkPage,
});
