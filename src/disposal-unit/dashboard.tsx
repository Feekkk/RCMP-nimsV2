import { DisposalUnitShell } from '@/disposal-unit/disposal-unit-shell';
import { readDisposalUnitSession } from '@/lib/auth-session';

export function DisposalUnitDashboardPage() {
  const session = readDisposalUnitSession();

  return (
    <DisposalUnitShell>
      <div className="mb-5 flex flex-col gap-1 sm:mb-6">
        <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">Disposal dashboard</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Review and process assets marked for disposal.
          {session ? ` Signed in as ${session.fullName}.` : ''}
        </p>
      </div>
      <div className="rounded-[12px] border border-border/70 bg-card/40 p-5 text-sm text-muted-foreground">
        Disposal workflows will appear here.
      </div>
    </DisposalUnitShell>
  );
}
