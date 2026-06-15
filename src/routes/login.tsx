import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { ArrowLeft, CheckCircle2, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { toast } from 'sonner';
import { Toaster } from '@/components/ui/sonner';
import { NimsLogo } from '@/components/brand/NimsLogo';
import { isAdminRole, isStaffRole, persistSession } from '@/lib/auth-session';
import { isEmailOnlyUserLoginEnabledForClient } from '@/lib/email-login-config';
import { isMicrosoftSsoEnabledForClient } from '@/lib/microsoft-auth-config';
import { getMicrosoftLoginUrlFn, loginDevByEmailFn } from '@/server/auth.functions';

const MICROSOFT_OAUTH_STATE_KEY = 'nims-microsoft-oauth-state';

const LOGIN_SUCCESS_DELAY_MS = 1500;

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
  const navigate = useNavigate();
  const [role, setRole] = useState<'staff' | 'user'>('user');
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [devEmailLoading, setDevEmailLoading] = useState(false);
  const [loginSuccessMessage, setLoginSuccessMessage] = useState<string | null>(null);
  const microsoftSsoEnabled = isMicrosoftSsoEnabledForClient();
  const emailOnlyUserLoginEnabled = isEmailOnlyUserLoginEnabledForClient();
  const showDevEmailLogin = emailOnlyUserLoginEnabled;

  const redirectAfterLogin = (user: { roleId: number }) => {
    const to = isStaffRole(user.roleId)
      ? isAdminRole(user.roleId)
        ? '/admin/dashboard'
        : '/technician/dashboard'
      : '/user/request';
    window.setTimeout(() => {
      void navigate({ to });
    }, LOGIN_SUCCESS_DELAY_MS);
  };

  const handleDevEmailSignIn = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      toast.error('Enter your email first');
      return;
    }

    setDevEmailLoading(true);
    try {
      const user = await loginDevByEmailFn({
        data: { email: trimmedEmail, loginRole: role },
      });
      persistSession(user);
      const message = `Signed in successfully as ${user.email} (${user.roleName}).`;
      setLoginSuccessMessage(message);
      toast.success(message);
      redirectAfterLogin(user);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Authentication failed';
      toast.error(message);
    } finally {
      setDevEmailLoading(false);
    }
  };

  const handleContinue = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedEmail = email.trim();
    if (!trimmedEmail) return;

    if (!microsoftSsoEnabled) {
      if (showDevEmailLogin) {
        await handleDevEmailSignIn();
      } else {
        toast.error('Microsoft sign-in is not configured. Contact your administrator.');
      }
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

  const subtitle = microsoftSsoEnabled
    ? 'Enter your email and role. We verify your account, then sign you in with Microsoft.'
    : showDevEmailLogin
      ? 'Sign in with your email (dev).'
      : 'Microsoft sign-in is not configured.';
  const loading = isLoading || devEmailLoading;

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
              <p className="mt-2 text-sm leading-[1.5] text-muted-foreground">{subtitle}</p>
            </div>
          </div>

          <form onSubmit={handleContinue} className="space-y-4">
            <div>
              <Label>Access the System</Label>
              <Select
                value={role}
                onValueChange={(v) => setRole(v as 'staff' | 'user')}
                disabled={loading || !!loginSuccessMessage}
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
                disabled={loading || !!loginSuccessMessage}
              />
            </div>

            {loginSuccessMessage && (
              <Alert className="border-emerald-500/40 bg-emerald-50 text-emerald-950 dark:bg-emerald-950/40 dark:text-emerald-100">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <AlertTitle>Sign in successful</AlertTitle>
                <AlertDescription>{loginSuccessMessage} Redirecting…</AlertDescription>
              </Alert>
            )}

            <Button
              type="submit"
              className="w-full gap-2 rounded-[8px] bg-foreground font-semibold text-background hover:opacity-90"
              disabled={loading || !!loginSuccessMessage}
            >
              {microsoftSsoEnabled && (
                <svg className="h-4 w-4" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                  <rect x="1" y="1" width="10.5" height="10.5" rx="1" fill="#f35325" />
                  <rect x="12.5" y="1" width="10.5" height="10.5" rx="1" fill="#81bc06" />
                  <rect x="1" y="12.5" width="10.5" height="10.5" rx="1" fill="#00a4ef" />
                  <rect x="12.5" y="12.5" width="10.5" height="10.5" rx="1" fill="#ffba08" />
                </svg>
              )}
              {loading
                ? microsoftSsoEnabled
                  ? 'Redirecting to Microsoft…'
                  : 'Signing in…'
                : microsoftSsoEnabled
                  ? 'Continue with Microsoft'
                  : 'Sign in with email'}
            </Button>

            {showDevEmailLogin && microsoftSsoEnabled && (
              <>
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="bg-card px-2 text-muted-foreground">or dev</span>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full rounded-[8px]"
                  disabled={loading || !!loginSuccessMessage}
                  onClick={() => void handleDevEmailSignIn()}
                >
                  {devEmailLoading ? 'Signing in…' : 'Dev sign in with email'}
                </Button>
              </>
            )}
          </form>

          {microsoftSsoEnabled && (
            <p className="text-center text-xs text-muted-foreground">
              {role === 'user'
                ? 'New users: if your email is not registered yet, we create your account using your Microsoft Entra ID after sign-in.'
                : 'Staff must be registered by an administrator before signing in.'}
            </p>
          )}

          {showDevEmailLogin && microsoftSsoEnabled && (
            <p className="text-center text-xs text-muted-foreground">
              Dev sign-in skips Microsoft. User accounts are auto-created; staff must exist in the database.
            </p>
          )}

          {!microsoftSsoEnabled && !showDevEmailLogin && (
            <p className="text-center text-xs text-muted-foreground">
              Microsoft sign-in is not configured. Contact your administrator.
            </p>
          )}
        </div>
      </div>
      <Toaster />
    </div>
  );
}
