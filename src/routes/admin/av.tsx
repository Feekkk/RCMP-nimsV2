import { createFileRoute } from '@tanstack/react-router';
import { AdminAvPage } from '@/admin/av';

export const Route = createFileRoute('/admin/av')({
  head: () => ({
    meta: [
      { title: 'AV equipment | NIMS Admin' },
      { name: 'description', content: 'Administrator overview of AV equipment inventory.' },
    ],
  }),
  component: AdminAvPage,
});
