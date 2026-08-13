import { useEffect, type ReactNode } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { NimsLogo } from '@/components/brand/NimsLogo';
import { Button } from '@/components/ui/button';
import { Toaster } from '@/components/ui/sonner';
import {
  clearAllSessions,
  getPostLoginPath,
  hasDisposalUnitSession,
  readDisposalUnitSession,
  readPrivilegedSession,
} from '@/lib/auth-session';

export function DisposalUnitShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const user = readPrivilegedSession();
    if (user && !hasDisposalUnitSession()) {
      void navigate({ to: getPostLoginPath(user.roleId) });
      return;
    }
    if (!hasDisposalUnitSession()) {
      void navigate({ to: '/login' });
    }
  }, [navigate]);

  const handleSignOut = async () => {
    await clearAllSessions();
    void navigate({ to: '/' });
  };

  const session = readDisposalUnitSession();

  return (
    <div className="relative flex min-h-svh flex-col bg-background">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-[160px] right-[8%] h-[480px] w-[480px] rounded-full bg-lavender/[0.08] blur-[90px]" />
      </div>

      <header className="relative sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <NimsLogo size="sm" variant="light" />
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Disposal unit
              </p>
              <p className="truncate text-sm font-bold text-foreground">Asset disposal workspace</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {session ? (
              <p className="hidden truncate text-sm text-muted-foreground sm:block">{session.fullName}</p>
            ) : null}
            <Button type="button" variant="outline" className="rounded-[8px]" onClick={() => void handleSignOut()}>
              Sign out
            </Button>
          </div>
        </div>
      </header>

      <main className="relative mx-auto w-full max-w-6xl flex-1 px-4 py-5 sm:px-6 sm:py-6">{children}</main>
      <Toaster />
    </div>
  );
}
