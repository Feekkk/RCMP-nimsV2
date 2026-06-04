import { createFileRoute } from '@tanstack/react-router';
import { AdminDashboardPage } from '@/admin/dashboard';

export const Route = createFileRoute('/admin/dashboard')({
  head: () => ({
    meta: [
      { title: 'Admin dashboard | NIMS' },
      { name: 'description', content: 'System overview and analytics for administrators.' },
    ],
  }),
  component: AdminDashboardPage,
});
