import { Link } from '@tanstack/react-router';
import { History, LogOut, UserPen } from 'lucide-react';
import { NimsLogo } from '@/components/brand/NimsLogo';
import { Button } from '@/components/ui/button';
import type { SessionUser } from '@/lib/auth-session';

export function UserPageChrome({
  session,
  onSignOut,
  active,
}: {
  session: Pick<SessionUser, 'fullName' | 'email'>;
  onSignOut: () => void;
  active?: 'request' | 'history' | 'profile';
}) {
  return (
    <header className="sticky top-0 z-10 border-b border-border/80 bg-card/90 backdrop-blur-sm">
      <div className="mx-auto max-w-2xl px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <Link to="/user/request" className="flex shrink-0 items-center gap-2">
            <NimsLogo size="sm" variant="light" />
          </Link>
          <div className="min-w-0 flex-1 text-center">
            <p className="truncate text-sm font-medium">{session.fullName}</p>
            <p className="truncate text-xs text-muted-foreground">{session.email}</p>
          </div>
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
        <nav className="mt-3 flex flex-wrap gap-2" aria-label="User navigation">
          <Button
            variant={active === 'request' ? 'secondary' : 'outline'}
            size="sm"
            className="h-8 flex-1 rounded-[8px] text-xs sm:flex-none"
            asChild
          >
            <Link to="/user/request">New request</Link>
          </Button>
          <Button
            variant={active === 'history' ? 'secondary' : 'outline'}
            size="sm"
            className="h-8 flex-1 gap-1 rounded-[8px] text-xs sm:flex-none"
            asChild
          >
            <Link to="/user/history">
              <History className="h-3.5 w-3.5" />
              History
            </Link>
          </Button>
          <Button
            variant={active === 'profile' ? 'secondary' : 'outline'}
            size="sm"
            className="h-8 flex-1 gap-1 rounded-[8px] text-xs sm:flex-none"
            asChild
          >
            <Link to="/user/edit-profile">
              <UserPen className="h-3.5 w-3.5" />
              Edit profile
            </Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}
