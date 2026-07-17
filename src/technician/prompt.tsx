import { readTechnicianSession } from '@/lib/auth-session';
import { PromptChatPage } from '@/prompt/prompt-page';
import { TechnicianShell } from '@/technician/technician-shell';

export function TechnicianPromptPage() {
  return (
    <PromptChatPage
      Shell={TechnicianShell}
      getSession={readTechnicianSession}
      sessionExpiredMessage="Technician session expired. Sign in again."
    />
  );
}
