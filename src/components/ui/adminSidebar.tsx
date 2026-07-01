import * as React from 'react';
import { Link, useRouterState } from '@tanstack/react-router';
import { Download, LayoutDashboard, Settings, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { NimsLogo } from '@/components/brand/NimsLogo';

const DASH = '/admin/dashboard' as const;
const USERS = '/admin/users' as const;
const EXPORT = '/admin/export' as const;
const SETTINGS = '/admin/settings' as const;

function NavLink({
  to,
  icon: Icon,
  children,
  active,
}: {
  to: string;
  icon: React.ElementType;
  children: React.ReactNode;
  active?: boolean;
}) {
  return (
    <Link
      to={to}
      className={cn(
        'flex items-center gap-2.5 rounded-[10px] px-3 py-2 text-sm font-medium transition-colors',
        active
          ? 'bg-lavender/15 text-[oklch(0.45_0.12_290)]'
          : 'text-muted-foreground hover:bg-secondary/80 hover:text-foreground',
      )}
    >
      <Icon className="h-4 w-4 shrink-0 opacity-80" />
      {children}
    </Link>
  );
}

export interface AdminSideBarProps extends React.HTMLAttributes<HTMLElement> {
  embedded?: boolean;
}

function AdminSideBarNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <nav className="flex flex-col gap-1 p-3" aria-label="Administrator navigation">
      <NavLink to={DASH} icon={LayoutDashboard} active={pathname === DASH}>
        Dashboard
      </NavLink>
      <NavLink
        to={USERS}
        icon={Users}
        active={pathname === USERS || pathname.startsWith(`${USERS}/`)}
      >
        Manage user
      </NavLink>
      <NavLink
        to={EXPORT}
        icon={Download}
        active={pathname === EXPORT || pathname.startsWith(`${EXPORT}/`)}
      >
        Export
      </NavLink>
      <NavLink
        to={SETTINGS}
        icon={Settings}
        active={pathname === SETTINGS || pathname.startsWith(`${SETTINGS}/`)}
      >
        Setting
      </NavLink>
    </nav>
  );
}

const AdminSideBar = React.forwardRef<HTMLElement, AdminSideBarProps>(function AdminSideBar(
  { className, embedded, ...props },
  ref,
) {
  const inner = (
    <>
      <div className="shrink-0 border-b border-border px-4 py-4">
        <NimsLogo size="sm" variant="light" className="mx-auto" />
        <p className="mt-2 text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Administrator
        </p>
      </div>
      <ScrollArea className="min-h-0 flex-1">
        <AdminSideBarNav />
      </ScrollArea>
    </>
  );

  if (embedded) {
    return (
      <div ref={ref as React.Ref<HTMLDivElement>} className={cn('flex h-full min-h-0 flex-col', className)} {...props}>
        {inner}
      </div>
    );
  }

  return (
    <aside
      ref={ref}
      className={cn(
        'flex h-full min-h-0 w-56 shrink-0 flex-col border-r border-border bg-card/95 backdrop-blur-sm',
        className,
      )}
      {...props}
    >
      {inner}
    </aside>
  );
});

AdminSideBar.displayName = 'AdminSideBar';

export { AdminSideBar, AdminSideBarNav };
