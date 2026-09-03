import { useEffect, type ReactNode } from 'react';
import { useNavigate, useRouterState } from '@tanstack/react-router';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { AdminSideBar } from '@/components/ui/adminSidebar';
import { AskAiLink } from '@/components/ask-ai-link';
import { Toaster } from '@/components/ui/sonner';
import { clearAllSessions, getPostLoginPath, hasAdminSession, readPrivilegedSession } from '@shared/lib/auth-session';
import { AssetLookupButton } from '@/technician/asset-lookup';

export function AdminShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const showAskAi = pathname !== '/admin/prompt' && !pathname.startsWith('/admin/prompt/');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const user = readPrivilegedSession();
    if (!hasAdminSession()) {
      if (user) {
        void navigate({ to: getPostLoginPath(user.roleId) });
      } else {
        void navigate({ to: '/login' });
      }
    }
  }, [navigate]);

  const handleSignOut = async () => {
    await clearAllSessions();
    void navigate({ to: '/' });
  };

  return (
    <div className="relative flex min-h-svh bg-background">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-[160px] right-[8%] h-[480px] w-[480px] rounded-full bg-lavender/[0.08] blur-[90px]" />
      </div>

      <AdminSideBar className="sticky top-0 z-40 hidden h-svh shrink-0 md:flex" onSignOut={handleSignOut} />

      <div className="relative flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur-md md:hidden">
          <div className="flex h-14 items-center px-4">
            <Sheet>
              <SheetTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="shrink-0 rounded-[8px]"
                  type="button"
                  aria-label="Open navigation menu"
                >
                  <Menu className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="flex h-full w-[min(20rem,85vw)] flex-col p-0">
                <AdminSideBar embedded className="min-h-0 flex-1 overflow-hidden" onSignOut={handleSignOut} />
              </SheetContent>
            </Sheet>
          </div>
        </header>

        <main className="relative w-full flex-1 px-4 pb-5 pt-8 sm:px-6 sm:pb-6 sm:pt-10 md:px-8">
          {showAskAi ? (
            <div className="absolute right-4 top-4 z-20 sm:right-6 sm:top-5 md:right-8">
              <AskAiLink to="/admin/prompt" />
            </div>
          ) : null}
          {children}
        </main>
      </div>
      <AssetLookupButton variant="admin" />
      <Toaster />
    </div>
  );
}
