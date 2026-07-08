import { useEffect, type ReactNode } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { LogOut, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { TechSideBar } from '@/components/ui/techSideBar';
import { Toaster } from '@/components/ui/sonner';
import { clearAllSessions, hasTechnicianSession, isAdminRole, readTechnicianSession } from '@/lib/auth-session';
import { AssetLookupButton } from '@/technician/asset-lookup';

export function TechnicianShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const user = readTechnicianSession();
    if (user && isAdminRole(user.roleId)) {
      void navigate({ to: '/admin/dashboard' });
      return;
    }
    if (!hasTechnicianSession()) {
      void navigate({ to: '/login' });
    }
  }, [navigate]);

  const handleSignOut = () => {
    clearAllSessions();
    void navigate({ to: '/login' });
  };

  return (
    <div className="relative flex min-h-svh bg-background">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-[160px] right-[8%] h-[480px] w-[480px] rounded-full bg-lavender/[0.08] blur-[90px]" />
      </div>

      <TechSideBar className="sticky top-0 z-40 hidden h-svh shrink-0 md:flex" />

      <div className="relative flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur-md">
          <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <Sheet>
                <SheetTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="shrink-0 rounded-[8px] md:hidden"
                    type="button"
                    aria-label="Open navigation menu"
                  >
                    <Menu className="h-4 w-4" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="flex h-full w-[min(20rem,85vw)] flex-col p-0">
                  <TechSideBar embedded className="min-h-0 flex-1 overflow-hidden" />
                </SheetContent>
              </Sheet>
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold uppercase tracking-wider text-muted-foreground">Technician</p>
                <p className="truncate text-sm font-bold text-foreground">Asset Management System</p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="rounded-[8px] text-muted-foreground hover:text-foreground"
                onClick={handleSignOut}
                title="Sign out"
                type="button"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </header>

        <main className="relative mx-auto w-full max-w-6xl flex-1 px-4 py-5 sm:px-6 sm:py-6">{children}</main>
      </div>
      <AssetLookupButton />
      <Toaster />
    </div>
  );
}
