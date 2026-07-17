import { AdminShell } from '@/admin/admin-shell';
import { readAdminSession } from '@/lib/auth-session';
import { PromptChatPage } from '@/prompt/prompt-page';

export function AdminPromptPage() {
  return (
    <PromptChatPage
      Shell={AdminShell}
      getSession={readAdminSession}
      sessionExpiredMessage="Administrator session expired. Sign in again."
    />
  );
}
