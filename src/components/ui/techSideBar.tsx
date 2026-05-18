import * as React from 'react';
import { Link, useRouterState } from '@tanstack/react-router';
import {
  BookOpen,
  ChevronDown,
  ClipboardList,
  History,
  Inbox,
  Laptop,
  LayoutDashboard,
  Network,
  Package,
  Trash2,
  Tv,
  UserCircle,
  UserPlus,
} from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { NimsLogo } from '@/components/brand/NimsLogo';

const DASH = '/technician/dashboard' as const;
const LAPTOP = '/technician/laptop' as const;
const AV = '/technician/av' as const;
const NETWORK = '/technician/network' as const;
const REQUEST_ASSETS = '/technician/request-assets' as const;
const REQUESTS = '/technician/requests' as const;

const HASH = {
  dashboard: '',
  inventoryNetwork: 'inventory-network',
  requestAssign: 'request-assign-assets',
  requestUser: 'request-user',
  disposal: 'disposal',
  history: 'history',
  manual: 'manual',
  profile: 'profile',
} as const;

type HashValue = (typeof HASH)[keyof typeof HASH];

function useNavHash(): string {
  return useRouterState({
    select: (s) => (s.location.hash ?? '').replace(/^#/, ''),
  });
}

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

function NavCollapsible({
  title,
  icon: Icon,
  defaultOpen,
  children,
}: {
  title: string;
  icon: React.ElementType;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Collapsible defaultOpen={defaultOpen} className="group/coll">
      <CollapsibleTrigger
        className={cn(
          'flex w-full items-center justify-between gap-2 rounded-[10px] px-3 py-2 text-sm font-medium',
          'text-muted-foreground hover:bg-secondary/80 hover:text-foreground transition-colors',
          'outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        )}
      >
        <span className="flex items-center gap-2.5">
          <Icon className="h-4 w-4 shrink-0 opacity-80" />
          {title}
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 opacity-60 transition-transform duration-200 group-data-[state=open]/coll:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-0.5 pt-1 pl-2 overflow-hidden">
        <div className="border-l border-border/70 pl-3 ml-1.5 space-y-0.5">{children}</div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export interface TechSideBarProps extends React.HTMLAttributes<HTMLElement> {
  /** Omit outer &lt;aside&gt; wrapper (e.g. inside a mobile sheet). */
  embedded?: boolean;
}

function TechSideBarNav() {
  const h = useNavHash();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const dashActive = pathname === '/technician/dashboard' && !h;
  const laptopActive = pathname === '/technician/laptop';
  const avActive = pathname === '/technician/av';
  const networkActive = pathname === '/technician/network';
  const requestAssetsActive = pathname === REQUEST_ASSETS;
  const requestsActive = pathname === REQUESTS;

  return (
    <nav className="flex flex-col gap-1 p-3" aria-label="Technician navigation">
      <NavLink to={DASH} icon={LayoutDashboard} active={dashActive}>
        Dashboard
      </NavLink>

      <NavCollapsible title="Inventory" icon={Package} defaultOpen>
        <NavLink to={LAPTOP} icon={Laptop} active={laptopActive}>
          Laptop / Desktop
        </NavLink>
        <NavLink to={AV} icon={Tv} active={avActive}>
          AV
        </NavLink>
        <NavLink to={NETWORK} icon={Network} active={networkActive}>
          Network
        </NavLink>
      </NavCollapsible>

      <NavCollapsible title="Request" icon={Inbox} defaultOpen>
        <NavLink to={REQUEST_ASSETS} icon={UserPlus} active={requestAssetsActive}>
          Assign Assets
        </NavLink>
        <NavLink to={REQUESTS} icon={ClipboardList} active={requestsActive}>
          User Request
        </NavLink>
      </NavCollapsible>

      <NavLink to={`${DASH}#${HASH.disposal}`} icon={Trash2} active={h === HASH.disposal}>
        Disposal
      </NavLink>
      <NavLink to={`${DASH}#${HASH.history}`} icon={History} active={h === HASH.history}>
        History
      </NavLink>
      <NavLink to={`${DASH}#${HASH.manual}`} icon={BookOpen} active={h === HASH.manual}>
        Manual
      </NavLink>
      <NavLink to={`${DASH}#${HASH.profile}`} icon={UserCircle} active={h === HASH.profile}>
        Profile
      </NavLink>
    </nav>
  );
}

const TechSideBar = React.forwardRef<HTMLElement, TechSideBarProps>(function TechSideBar(
  { className, embedded, ...props },
  ref,
) {
  const inner = (
    <>
      <div className="shrink-0 border-b border-border px-4 py-4">
        <NimsLogo size="sm" variant="light" />
        <p className="mt-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Technician</p>
      </div>
      <ScrollArea className="min-h-0 flex-1">
        <TechSideBarNav />
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

TechSideBar.displayName = 'TechSideBar';

export { TechSideBar, TechSideBarNav, HASH as TECH_SIDEBAR_HASH };
