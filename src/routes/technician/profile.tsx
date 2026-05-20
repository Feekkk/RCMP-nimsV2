import { createFileRoute } from '@tanstack/react-router';
import { TechnicianProfilePage } from '@/technician/profile-page';

export const Route = createFileRoute('/technician/profile')({
  head: () => ({
    meta: [
      { title: 'My profile | NIMS' },
      { name: 'description', content: 'Edit your technician account details.' },
    ],
  }),
  component: TechnicianProfilePage,
});
