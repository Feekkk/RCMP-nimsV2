import { createFileRoute } from '@tanstack/react-router';
import { TechnicianDisposalPage } from '@/technician/disposal';

export const Route = createFileRoute('/technician/disposal')({
  head: () => ({
    meta: [
      { title: 'Asset disposal | NIMS' },
      { name: 'description', content: 'Record disposal for non-active or offline assets.' },
    ],
  }),
  component: TechnicianDisposalPage,
});
