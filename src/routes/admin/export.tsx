import { createFileRoute } from '@tanstack/react-router';
import { AdminExportPage } from '@/admin/export';

export const Route = createFileRoute('/admin/export')({
  head: () => ({
    meta: [
      { title: 'Export | NIMS' },
      { name: 'description', content: 'Export NIMS data as CSV.' },
    ],
  }),
  component: AdminExportPage,
});
