import { createFileRoute } from '@tanstack/react-router';
import { UserEditProfilePage } from '@/user/editProfile';

export const Route = createFileRoute('/user/edit-profile')({
  head: () => ({
    meta: [
      { title: 'Edit profile | NIMS' },
      { name: 'description', content: 'Update your NIMS user profile.' },
    ],
  }),
  component: UserEditProfilePage,
});
