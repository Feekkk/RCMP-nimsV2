import { createFileRoute } from '@tanstack/react-router';
import { PmFormPage } from '@/technician/pm-form';

export const Route = createFileRoute('/technician/pm-form')({
  head: () => ({
    meta: [
      { title: 'Run maintenance | NIMS' },
      {
        name: 'description',
        content: 'Run preventive maintenance by location and complete asset checklists.',
      },
    ],
  }),
  component: PmFormPage,
});
