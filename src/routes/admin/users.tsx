import { createFileRoute } from '@tanstack/react-router';
import { AdminUsersPage } from '@/admin/users';

export const Route = createFileRoute('/admin/users')({
  head: () => ({
    meta: [
      { title: 'Manage users | NIMS' },
      { name: 'description', content: 'Manage NIMS user accounts.' },
    ],
  }),
  component: AdminUsersPage,
});
