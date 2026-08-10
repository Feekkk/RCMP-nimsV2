import { createFileRoute } from '@tanstack/react-router';
import { PmChecklistPage } from '@/technician/pm-checklist';

export const Route = createFileRoute('/technician/pm-checklist')({
  head: () => ({
    meta: [
      { title: 'Manage checklists | NIMS' },
      {
        name: 'description',
        content: 'Add and edit preventive maintenance checklist categories and items.',
      },
    ],
  }),
  component: PmChecklistPage,
});
