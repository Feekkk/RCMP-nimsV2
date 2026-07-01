import { createFileRoute } from '@tanstack/react-router';
import { LandingPage } from '@/components/landing/LandingPage';
import { Toaster } from '@/components/ui/sonner';

export const Route = createFileRoute('/')({
  component: Index,
});

function Index() {
  return (
    <>
      <LandingPage />
      <Toaster />
    </>
  );
}
