import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { ArrowLeft, Briefcase, CheckCircle2, IdCard, Lock, Mail, Phone, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { toast } from 'sonner';
import { Toaster } from '@/components/ui/sonner';
import { NimsLogo } from '@/components/brand/NimsLogo';
import { clearAllSessions, persistSession } from '@/lib/auth-session';
import { loginStaffFn, loginUserFn, registerUserFn } from '@/server/auth.functions';

const REGISTER_REDIRECT_SECONDS = 5;
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
  const [isLogin, setIsLogin] = useState(true);
  const [role, setRole] = useState<'staff' | 'user'>('user');
  const [staffId, setStaffId] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [userId, setUserId] = useState('');
  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [registerCountdown, setRegisterCountdown] = useState<number | null>(null);
  const [registerSuccessName, setRegisterSuccessName] = useState<string | null>(null);
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [loginSuccessMessage, setLoginSuccessMessage] = useState<string | null>(null);

  const isRegisterCooldown = registerCountdown !== null;

  useEffect(() => {
    if (registerCountdown === null || registerCountdown <= 0) return;
    const timer = window.setTimeout(() => {
      setRegisterCountdown((prev) => {
        if (prev === null || prev <= 1) return 0;
        return prev - 1;
      });
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [registerCountdown]);

  useEffect(() => {
    if (registerCountdown !== 0) return;
    setRegisterCountdown(null);
    setRegisterSuccessName(null);
    setIsLogin(true);
    setRole('user');
    setPassword('');
    setName('');
    setUserId('');
    setPhone('');
    if (registeredEmail) setEmail(registeredEmail);
    toast.message('Please sign in with your new account');
  }, [registerCountdown, registeredEmail]);

  const resetRegisterForm = () => {
    setName('');
    setUserId('');
    setEmail('');
    setPhone('');
    setPassword('');
  };

  const toggleLoginMode = () => {
    if (isRegisterCooldown) return;
    setIsLogin((v) => !v);
    setLoginSuccessMessage(null);
    if (!isLogin) {
      setRole('user');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isLogin) {
        if (role === 'staff') {
          const user = await loginStaffFn({
            data: { staffId: staffId.trim(), password },
          });
          persistSession(user);
          const message = `Signed in successfully as ${user.fullName} (${user.roleName}).`;
          setLoginSuccessMessage(message);
          toast.success(message);
          window.setTimeout(() => {
            void navigate({ to: '/technician/dashboard' });
          }, LOGIN_SUCCESS_DELAY_MS);
        } else {
          const user = await loginUserFn({
            data: { email: email.trim(), password },
          });
          persistSession(user);
          const message = `Welcome back, ${user.fullName}! Signed in successfully.`;
          setLoginSuccessMessage(message);
          toast.success(message);
          window.setTimeout(() => {
            void navigate({ to: '/' });
          }, LOGIN_SUCCESS_DELAY_MS);
        }
      } else {
        const registered = await registerUserFn({
          data: {
            staffId: userId.trim(),
            fullName: name.trim(),
            email: email.trim(),
            password,
            phone: phone.trim() || undefined,
          },
        });
        clearAllSessions();
        setRegisteredEmail(email.trim());
        resetRegisterForm();
        setRegisterSuccessName(registered.fullName);
        setRegisterCountdown(REGISTER_REDIRECT_SECONDS);
        toast.success(`Account created for ${registered.fullName}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Authentication failed';
      toast.error(message);
    } finally {
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
                {isRegisterCooldown
                  ? 'Account created'
                  : isLogin
                    ? 'Sign in to NIMS'
                    : 'Create your NIMS account'}
              </h1>
              <p className="mt-2 text-sm leading-[1.5] text-muted-foreground">
                {isRegisterCooldown
                  ? 'You will be redirected to sign in shortly.'
                  : isLogin
                    ? 'Manage your inventory in one place'
                    : 'User accounts only (role: user). Staff accounts are provisioned by an administrator.'}
              </p>
            </div>
          </div>

          <Button
            variant="outline"
            className="w-full gap-2 rounded-[8px] border-border"
            type="button"
            disabled
            title="Coming soon"
          >
            <svg className="h-4 w-4 opacity-50" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden>
              <rect x="1" y="1" width="10.5" height="10.5" rx="1" fill="#f35325" />
              <rect x="12.5" y="1" width="10.5" height="10.5" rx="1" fill="#81bc06" />
              <rect x="1" y="12.5" width="10.5" height="10.5" rx="1" fill="#00a4ef" />
              <rect x="12.5" y="12.5" width="10.5" height="10.5" rx="1" fill="#ffba08" />
            </svg>
            <span className="text-muted-foreground">Continue with Microsoft SSO</span>
            <span className="ml-auto rounded-[6px] bg-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Coming soon
            </span>
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-card px-2 text-muted-foreground">or</span>
            </div>
          </div>

          {loginSuccessMessage && (
            <Alert className="border-emerald-500/40 bg-emerald-50 text-emerald-950 dark:bg-emerald-950/40 dark:text-emerald-100">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <AlertTitle>Sign in successful</AlertTitle>
              <AlertDescription>{loginSuccessMessage} Redirecting…</AlertDescription>
            </Alert>
          )}

          {isRegisterCooldown && registerSuccessName && (
            <Alert className="border-emerald-500/40 bg-emerald-50 text-emerald-950 dark:bg-emerald-950/40 dark:text-emerald-100">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <AlertTitle>Registration successful</AlertTitle>
              <AlertDescription>
                Your account for <span className="font-semibold">{registerSuccessName}</span> has been created.
                Please sign in in{' '}
                <span className="font-semibold tabular-nums">{registerCountdown}</span>{' '}
                second{registerCountdown === 1 ? '' : 's'}.
              </AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            {!isRegisterCooldown && isLogin ? (
              <div>
                <Label>Sign in as</Label>
                <Select value={role} onValueChange={(v) => setRole(v as 'staff' | 'user')}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="staff">Staff</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ) : !isRegisterCooldown ? (
              <>
                <div className="relative">
                  <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Full name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    autoComplete="name"
                    className="h-11 rounded-[8px] pl-9 sm:h-9"
                  />
                </div>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    className="h-11 rounded-[8px] pl-9 sm:h-9"
                  />
                </div>
                <div className="relative">
                  <IdCard className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="User ID"
                    value={userId}
                    onChange={(e) => setUserId(e.target.value)}
                    required
                    autoComplete="username"
                    className="h-11 rounded-[8px] pl-9 sm:h-9"
                  />
                </div>
                <div className="relative">
                  <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="tel"
                    placeholder="Phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    autoComplete="tel"
                    className="h-11 rounded-[8px] pl-9 sm:h-9"
                  />
                </div>
              </>
            ) : null}

            {!isRegisterCooldown && isLogin && role === 'staff' && (
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
            )}

            {!isRegisterCooldown && isLogin && role === 'user' && (
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="h-11 rounded-[8px] pl-9 sm:h-9"
                />
              </div>
            )}

            {!isRegisterCooldown && (
              <>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    autoComplete={isLogin ? 'current-password' : 'new-password'}
                    className="h-11 rounded-[8px] pl-9 sm:h-9"
                    disabled={!!loginSuccessMessage}
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full bg-foreground font-semibold text-background hover:opacity-90"
                  disabled={isLoading || !!loginSuccessMessage}
                >
                  {isLoading ? 'Loading...' : isLogin ? 'Sign in' : 'Sign up'}
                </Button>
              </>
            )}
          </form>

          <p className="text-center text-xs text-muted-foreground">
            {isLogin ? "Don't have an account?" : 'Already have an account?'}{' '}
            <button
              type="button"
              onClick={toggleLoginMode}
              disabled={isRegisterCooldown || !!loginSuccessMessage}
              className="font-semibold text-[oklch(0.45_0.12_290)] hover:underline disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLogin ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </div>
      </div>
      <Toaster />
    </div>
  );
}
