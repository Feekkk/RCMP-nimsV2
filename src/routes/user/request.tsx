import { createFileRoute } from '@tanstack/react-router';
import { UserRequestFormPage } from '@/user/form';

export const Route = createFileRoute('/user/request')({
  head: () => ({
    meta: [
      { title: 'Equipment request | NIMS' },
      { name: 'description', content: 'Submit an equipment borrow request.' },
    ],
  }),
  component: UserRequestFormPage,
});
