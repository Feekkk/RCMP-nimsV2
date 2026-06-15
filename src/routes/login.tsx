import { createFileRoute, Link } from '@tanstack/react-router';
import { useState } from 'react';
import { ArrowLeft, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Toaster } from '@/components/ui/sonner';
import { NimsLogo } from '@/components/brand/NimsLogo';
import { isMicrosoftSsoEnabledForClient } from '@/lib/microsoft-auth-config';
import { getMicrosoftLoginUrlFn } from '@/server/auth.functions';

const MICROSOFT_OAUTH_STATE_KEY = 'nims-microsoft-oauth-state';

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
  const [role, setRole] = useState<'staff' | 'user'>('user');
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const microsoftSsoEnabled = isMicrosoftSsoEnabledForClient();

  const handleContinue = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedEmail = email.trim();
    if (!trimmedEmail) return;

    if (!microsoftSsoEnabled) {
      toast.error('Microsoft sign-in is not configured. Contact your administrator.');
      return;
    }

    setIsLoading(true);

    try {
      const { url, state } = await getMicrosoftLoginUrlFn({
        data: { email: trimmedEmail, loginRole: role },
      });
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
                {microsoftSsoEnabled
                  ? 'Enter your email and role. We verify your account, then sign you in with Microsoft.'
                  : 'Microsoft sign-in is not configured.'}
              </p>
            </div>
          </div>

          <form onSubmit={handleContinue} className="space-y-4">
            <div>
              <Label>Access the System</Label>
              <Select
                value={role}
                onValueChange={(v) => setRole(v as 'staff' | 'user')}
                disabled={isLoading || !microsoftSsoEnabled}
              >
                <SelectTrigger className="mt-1.5 rounded-[8px]">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="staff">Staff</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="relative">
              <Label htmlFor="login-email">Email</Label>
              <Mail className="pointer-events-none absolute left-3 top-[calc(50%+0.625rem)] h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="login-email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="mt-1.5 h-11 rounded-[8px] pl-9 sm:h-9"
                disabled={isLoading || !microsoftSsoEnabled}
              />
            </div>

            <Button
              type="submit"
              className="w-full gap-2 rounded-[8px] bg-foreground font-semibold text-background hover:opacity-90"
              disabled={isLoading || !microsoftSsoEnabled}
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                <rect x="1" y="1" width="10.5" height="10.5" rx="1" fill="#f35325" />
                <rect x="12.5" y="1" width="10.5" height="10.5" rx="1" fill="#81bc06" />
                <rect x="1" y="12.5" width="10.5" height="10.5" rx="1" fill="#00a4ef" />
                <rect x="12.5" y="12.5" width="10.5" height="10.5" rx="1" fill="#ffba08" />
              </svg>
              {isLoading ? 'Redirecting to Microsoft…' : 'Continue with Microsoft'}
            </Button>
          </form>

          {microsoftSsoEnabled ? (
            <p className="text-center text-xs text-muted-foreground">
              {role === 'user'
                ? 'New users: if your email is not registered yet, we create your account using your Microsoft Entra ID after sign-in.'
                : 'Staff must be registered by an administrator before signing in.'}
            </p>
          ) : (
            <p className="text-center text-xs text-muted-foreground">
              Contact your administrator to enable Microsoft sign-in.
            </p>
          )}
        </div>
      </div>
      <Toaster />
    </div>
  );
}
