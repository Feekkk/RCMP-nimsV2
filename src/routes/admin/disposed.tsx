import { createFileRoute } from '@tanstack/react-router';
import { AdminDisposedPage } from '@/admin/disposed';

export const Route = createFileRoute('/admin/disposed')({
  head: () => ({
    meta: [
      { title: 'Disposed stats | NIMS Admin' },
      { name: 'description', content: 'Yearly disposal batches, assets, and mix by kind.' },
    ],
  }),
  component: AdminDisposedPage,
});
