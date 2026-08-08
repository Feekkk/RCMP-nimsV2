import { Button } from '@/components/ui/button';
import { TechnicianShell } from '@/technician/technician-shell';
import { HomeIcon } from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';
export function PMpage() {

  return (
    <TechnicianShell>
      <div className="flex flex-col items-center justify-center h-full">
        <h1>Under Development</h1>
        <p>This page is under development. Please check back later.</p>
      </div>
    </TechnicianShell>
  );
}
