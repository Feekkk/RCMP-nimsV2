import { createFileRoute } from '@tanstack/react-router';
import { PMpage } from '@/technician/PMpage';

export const Route = createFileRoute('/technician/preventive-maintenance')({
  head: () => ({
    meta: [
      { title: 'Preventive maintenance | NIMS' },
      { name: 'description', content: 'Manage preventive maintenance for inventory assets.' },
    ],
  }),
  component: PMpage,
});
