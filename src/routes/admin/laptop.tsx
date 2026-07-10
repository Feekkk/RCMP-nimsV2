import { createFileRoute } from '@tanstack/react-router';
import { AdminLaptopPage } from '@/admin/laptop';

export const Route = createFileRoute('/admin/laptop')({
  head: () => ({
    meta: [
      { title: 'Laptop & desktop | NIMS Admin' },
      { name: 'description', content: 'Administrator overview of laptop and desktop inventory.' },
    ],
  }),
  component: AdminLaptopPage,
});
