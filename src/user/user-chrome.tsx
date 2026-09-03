import { Link } from '@tanstack/react-router';
import { ClipboardPlus, History, LogOut, UserRound } from 'lucide-react';
import { NimsLogo } from '@/components/brand/NimsLogo';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const tabs = [
  { id: 'request' as const, to: '/user/request', label: 'Request', icon: ClipboardPlus },
  { id: 'history' as const, to: '/user/history', label: 'History', icon: History },
  { id: 'profile' as const, to: '/user/edit-profile', label: 'Profile', icon: UserRound },
];

export function UserPageChrome({
  onSignOut,
  active,
}: {
  onSignOut: () => void;
  active?: 'request' | 'history' | 'profile';
}) {
  return (
    <>
      <header className="sticky top-0 z-10 border-b border-border/80 bg-card/90 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-2xl items-center justify-between px-4">
          <Link to="/user/request" className="flex shrink-0 items-center gap-2">
            <NimsLogo size="sm" variant="light" />
          </Link>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="shrink-0 rounded-[8px]"
            onClick={onSignOut}
          >
            <LogOut className="h-4 w-4" />
            <span className="sr-only">Sign out</span>
          </Button>
        </div>
      </header>
      <nav
        className="fixed inset-x-0 bottom-0 z-20 border-t border-border/80 bg-card/95 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1.5 backdrop-blur-md"
        aria-label="User navigation"
      >
        <div className="mx-auto grid max-w-2xl grid-cols-3">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = active === tab.id;
            return (
              <Link
                key={tab.id}
                to={tab.to}
                className={cn(
                  'flex flex-col items-center gap-0.5 py-1.5 text-[11px] font-medium transition-colors',
                  isActive ? 'text-primary' : 'text-muted-foreground',
                )}
              >
                <Icon className={cn('h-5 w-5', isActive && 'stroke-[2.25]')} />
                {tab.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
