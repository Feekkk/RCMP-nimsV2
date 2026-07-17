import { createFileRoute } from '@tanstack/react-router';
import { TechnicianPromptPage } from '@/technician/prompt';

export const Route = createFileRoute('/technician/prompt')({
  head: () => ({
    meta: [
      { title: 'Ask AI | NIMS' },
      { name: 'description', content: 'Chat with the NIMS inventory assistant.' },
    ],
  }),
  component: TechnicianPromptPage,
});
