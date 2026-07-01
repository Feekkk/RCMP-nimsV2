import { createFileRoute } from '@tanstack/react-router';
import { AdminSettingsPage } from '@/admin/settings';

export const Route = createFileRoute('/admin/settings')({
  head: () => ({
    meta: [
      { title: 'Settings | NIMS' },
      { name: 'description', content: 'System settings for NIMS administrators.' },
    ],
  }),
  component: AdminSettingsPage,
});
