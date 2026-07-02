import { createFileRoute, Link } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Toaster } from '@/components/ui/sonner';
import { NimsLogo } from '@/components/brand/NimsLogo';
import { getMicrosoftLoginUrlFn } from '@/server/auth.functions';
import { getLoginMaintenanceModeFn } from '@/server/system-settings.functions';
import { LOGIN_MAINTENANCE_MESSAGE } from '@/lib/system-settings';
import { MICROSOFT_OAUTH_STATE_KEY } from '@/auth/microsoft-callback-page';

function MicrosoftIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <rect x="1" y="1" width="10.5" height="10.5" rx="1" fill="#f35325" />
      <rect x="12.5" y="1" width="10.5" height="10.5" rx="1" fill="#81bc06" />
      <rect x="1" y="12.5" width="10.5" height="10.5" rx="1" fill="#00a4ef" />
      <rect x="12.5" y="12.5" width="10.5" height="10.5" rx="1" fill="#ffba08" />
    </svg>
  );
}

export const Route = createFileRoute('/login')({
  head: () => ({
    meta: [
      { title: 'Sign in | NIMS' },
      { name: 'description', content: 'Sign in to NIMS to manage your inventory.' },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [maintenanceEnabled, setMaintenanceEnabled] = useState(false);
  const [maintenanceLoading, setMaintenanceLoading] = useState(true);

  useEffect(() => {
    void getLoginMaintenanceModeFn()
      .then(({ enabled }) => setMaintenanceEnabled(enabled))
      .catch(() => setMaintenanceEnabled(false))
      .finally(() => setMaintenanceLoading(false));
  }, []);

  const handleMicrosoftSignIn = async () => {
    setIsLoading(true);

    try {
      const { url, state } = await getMicrosoftLoginUrlFn();
      sessionStorage.setItem(MICROSOFT_OAUTH_STATE_KEY, state);
      window.location.href = url;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sign-in unavailable';
      toast.error(message);
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-background">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-[200px] right-[10%] h-[600px] w-[600px] rounded-full bg-lavender/[0.12] blur-[100px]" />
        <div className="absolute -top-[100px] -left-[200px] h-[500px] w-[500px] rounded-full bg-[oklch(0.65_0.20_350)]/[0.08] blur-[80px]" />
      </div>
      <div className="relative flex min-h-screen items-center justify-center px-4 py-8">
        <Link
          to="/"
          className="absolute left-6 top-6 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>

        <div className="w-full max-w-sm space-y-6 rounded-[20px] border border-border/60 bg-card p-8 shadow-xl shadow-lavender/5">
          <div className="flex flex-col items-center gap-4 text-center">
            <NimsLogo size="lg" variant="light" />
            <div>
              <h1 className="text-xl font-bold leading-[0.96] tracking-[-0.02em] text-foreground sm:text-2xl">
                Welcome to NIMS
              </h1>
              <p className="mt-2 text-sm leading-[1.5] text-muted-foreground">
                Sign in with your organization Microsoft account.
              </p>
            </div>
          </div>

          {!maintenanceLoading && maintenanceEnabled && (
            <div className="rounded-[8px] border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-center text-xs text-amber-900 dark:text-amber-200">
              {LOGIN_MAINTENANCE_MESSAGE} - if you want to make request, please contact the IT Department or come to the office at Avicenna Building, Level 1.
            </div>
          )}

          {maintenanceLoading ? (
            <div className="flex h-11 items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Checking system status…
            </div>
          ) : (
            <div className="space-y-3">
              <Button
                type="button"
                className="h-11 w-full gap-2 rounded-[8px] bg-foreground font-semibold text-background hover:opacity-90"
                disabled={isLoading}
                onClick={() => void handleMicrosoftSignIn()}
              >
                <MicrosoftIcon />
                {isLoading ? 'Redirecting to Microsoft…' : 'Sign in with Microsoft'}
              </Button>
            </div>
          )}

          <p className="text-center text-xs text-muted-foreground">
            All the personal data is managed by Microsoft Entra ID. We do not store any of your personal data in our database.
          </p>
        </div>
      </div>
      <Toaster />
    </div>
  );
}
