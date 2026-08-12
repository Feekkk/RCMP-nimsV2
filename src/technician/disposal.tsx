import { TechnicianShell } from '@/technician/technician-shell';

export function TechnicianDisposalPage() {
  return (
    <TechnicianShell>
      <div className="mb-5 flex flex-col gap-1 sm:mb-6">
        <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
          Asset disposal
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Under development. The disposal flow will be re-enabled when the new workflow is ready.
        </p>
      </div>
      <div className="rounded-[12px] border border-border/70 bg-card/40 p-5 text-sm text-muted-foreground">
        Disposal actions are currently disabled.
      </div>
    </TechnicianShell>
  );
}
