import { createFileRoute } from '@tanstack/react-router';
import { AdminRequestPage } from '@/admin/request';

export const Route = createFileRoute('/admin/request')({
  head: () => ({
    meta: [
      { title: 'Equipment requests | NIMS Admin' },
      { name: 'description', content: 'Administrator overview of open equipment requests.' },
    ],
  }),
  component: AdminRequestPage,
});
