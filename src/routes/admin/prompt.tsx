import { createFileRoute } from '@tanstack/react-router';
import { AdminPromptPage } from '@/admin/prompt';

export const Route = createFileRoute('/admin/prompt')({
  head: () => ({
    meta: [
      { title: 'Ask AI | NIMS' },
      { name: 'description', content: 'Chat with the NIMS inventory assistant.' },
    ],
  }),
  component: AdminPromptPage,
});
