import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { ArrowLeft, Briefcase, CheckCircle2, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { toast } from 'sonner';
import { Toaster } from '@/components/ui/sonner';
import { NimsLogo } from '@/components/brand/NimsLogo';
import { isAdminRole, persistSession } from '@/lib/auth-session';
import { isMicrosoftSsoEnabledForClient } from '@/lib/microsoft-auth-config';
import { getMicrosoftLoginUrlFn, loginStaffFn } from '@/server/auth.functions';

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
  const [staffId, setStaffId] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loginSuccessMessage, setLoginSuccessMessage] = useState<string | null>(null);
  const [microsoftLoading, setMicrosoftLoading] = useState(false);
  const microsoftSsoEnabled = isMicrosoftSsoEnabledForClient();

  const userUsesSsoOnly = microsoftSsoEnabled && role === 'user';
  const showStaffPasswordForm = role === 'staff';

  const handleMicrosoftSignIn = async () => {
    setMicrosoftLoading(true);
    try {
      const { url, state } = await getMicrosoftLoginUrlFn();
      sessionStorage.setItem(MICROSOFT_OAUTH_STATE_KEY, state);
      window.location.href = url;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Microsoft sign-in unavailable';
      toast.error(message);
      setMicrosoftLoading(false);
    }
  };

  const handleStaffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const user = await loginStaffFn({
        data: { staffId: staffId.trim(), password },
      });
      persistSession(user);
      const message = `Signed in successfully as ${user.fullName} (${user.roleName}).`;
      setLoginSuccessMessage(message);
      toast.success(message);
      window.setTimeout(() => {
        void navigate({ to: isAdminRole(user.roleId) ? '/admin/dashboard' : '/technician/dashboard' });
      }, LOGIN_SUCCESS_DELAY_MS);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Authentication failed';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const subtitle =
    role === 'user'
      ? userUsesSsoOnly
        ? 'Access system with Microsoft account. Please check authenticator app for verification code.'
        : 'Access system with staff ID and password.'
      : 'Access system with staff ID and password.';

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

          <div>
            <Label>Access the System</Label>
            <Select value={role} onValueChange={(v) => setRole(v as 'staff' | 'user')}>
              <SelectTrigger className="mt-1.5 rounded-[8px]">
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="staff">Staff</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {microsoftSsoEnabled && (
            <Button
              variant={userUsesSsoOnly ? 'default' : 'outline'}
              className={
                userUsesSsoOnly
                  ? 'w-full gap-2 rounded-[8px] bg-foreground text-background hover:opacity-90'
                  : 'w-full gap-2 rounded-[8px] border-border'
              }
              type="button"
              disabled={microsoftLoading || !!loginSuccessMessage}
              onClick={() => void handleMicrosoftSignIn()}
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                <rect x="1" y="1" width="10.5" height="10.5" rx="1" fill="#f35325" />
                <rect x="12.5" y="1" width="10.5" height="10.5" rx="1" fill="#81bc06" />
                <rect x="1" y="12.5" width="10.5" height="10.5" rx="1" fill="#00a4ef" />
                <rect x="12.5" y="12.5" width="10.5" height="10.5" rx="1" fill="#ffba08" />
              </svg>
              {microsoftLoading ? 'Redirecting to Microsoft…' : 'Continue with Microsoft'}
            </Button>
          )}

          {userUsesSsoOnly && (
            <p className="text-center text-xs text-muted-foreground">
              No password or manual registration. Your profile is saved on first sign-in so you can return and
              submit requests later.
            </p>
          )}

          {microsoftSsoEnabled && showStaffPasswordForm && (
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-card px-2 text-muted-foreground">or</span>
              </div>
            </div>
          )}

          {loginSuccessMessage && (
            <Alert className="border-emerald-500/40 bg-emerald-50 text-emerald-950 dark:bg-emerald-950/40 dark:text-emerald-100">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <AlertTitle>Sign in successful</AlertTitle>
              <AlertDescription>{loginSuccessMessage} Redirecting…</AlertDescription>
            </Alert>
          )}

          {showStaffPasswordForm && (
            <form onSubmit={handleStaffSubmit} className="space-y-3">
              <div className="relative">
                <Briefcase className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Staff ID"
                  value={staffId}
                  onChange={(e) => setStaffId(e.target.value)}
                  required
                  autoComplete="username"
                  className="h-11 rounded-[8px] pl-9 sm:h-9"
                />
              </div>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  autoComplete="current-password"
                  className="h-11 rounded-[8px] pl-9 sm:h-9"
                  disabled={!!loginSuccessMessage}
                />
              </div>
              <Button
                type="submit"
                className="w-full rounded-[8px] bg-foreground font-semibold text-background hover:opacity-90"
                disabled={isLoading || !!loginSuccessMessage}
              >
                {isLoading ? 'Loading...' : 'Access the System'}
              </Button>
            </form>
          )}

          {!microsoftSsoEnabled && role === 'user' && (
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
