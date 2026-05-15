import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Toaster } from '@/components/ui/sonner';
import { NimsLogo } from '@/components/brand/NimsLogo';

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
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<'staff' | 'user'>('user');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isLogin) {
        toast.success(`Signed in as ${email}`);
        navigate({ to: '/' });
      } else {
        toast.success('Account created successfully');
        navigate({ to: '/' });
      }
    } catch (error) {
      toast.error('Authentication failed');
    }

    setIsLoading(false);
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      toast.success('Microsoft sign in successful');
      navigate({ to: '/' });
    } catch (error) {
      toast.error('Microsoft sign in failed');
    }
    setIsLoading(false);
  };

  return (
    <div className="relative min-h-screen bg-background">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-[200px] right-[10%] h-[600px] w-[600px] rounded-full bg-lavender/[0.12] blur-[100px]" />
        <div className="absolute -top-[100px] -left-[200px] h-[500px] w-[500px] rounded-full bg-[oklch(0.65_0.20_350)]/[0.08] blur-[80px]" />
      </div>

      <div className="relative flex min-h-screen items-center justify-center px-4 py-8">
        <Link to="/" className="absolute left-6 top-6 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>

        <div className="w-full max-w-sm space-y-6 rounded-[20px] border border-border/60 bg-card p-8 shadow-xl shadow-lavender/5">
          <div className="flex flex-col items-center gap-4 text-center">
            <NimsLogo size="lg" variant="light" />
            <div>
              <h1 className="text-xl font-bold leading-[0.96] tracking-[-0.02em] text-foreground sm:text-2xl">
                {isLogin ? 'Sign in to NIMS' : 'Create your NIMS account'}
              </h1>
              <p className="mt-2 text-sm leading-[1.5] text-muted-foreground">
                {isLogin ? 'Manage your inventory in one place' : 'Join your team on NIMS'}
              </p>
            </div>
          </div>

          <Button
            variant="outline"
            className="w-full gap-2 rounded-[8px] border-border"
            onClick={handleGoogleSignIn}
            disabled={isLoading}
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <rect x="1" y="1" width="10.5" height="10.5" rx="1" fill="#f35325" />
              <rect x="12.5" y="1" width="10.5" height="10.5" rx="1" fill="#81bc06" />
              <rect x="1" y="12.5" width="10.5" height="10.5" rx="1" fill="#00a4ef" />
              <rect x="12.5" y="12.5" width="10.5" height="10.5" rx="1" fill="#ffba08" />
            </svg>
            Continue with Microsoft SSO
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-card px-2 text-muted-foreground">or</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            {!isLogin && (
              <Input
                placeholder="Full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required={!isLogin}
                className="h-11 rounded-[8px] sm:h-9"
              />
            )}

            <div>
              <Label>Role</Label>
              <Select value={role} onValueChange={(v) => setRole(v as 'staff' | 'user')}>
                <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="staff">Staff</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="h-11 rounded-[8px] sm:h-9"
            />
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="h-11 rounded-[8px] sm:h-9"
            />
            <Button type="submit" className="w-full bg-foreground text-background font-semibold hover:opacity-90" disabled={isLoading}>
              {isLoading ? 'Loading...' : isLogin ? 'Sign in' : 'Sign up'}
            </Button>
          </form>

          <p className="text-center text-xs text-muted-foreground">
            {isLogin ? "Don't have an account?" : 'Already have an account?'}{' '}
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="font-semibold text-[oklch(0.45_0.12_290)] hover:underline"
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
