import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { IdCard, Lock, Mail, Phone, Shield, User, UserCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  clearAllSessions,
  persistSession,
  readTechnicianSession,
  type SessionUser,
} from '@/lib/auth-session';
import { getStaffProfileFn, updateStaffProfileFn } from '@/server/auth.functions';
import { FormField } from '@/technician/deploy-return-fields';
import { TechnicianShell } from '@/technician/technician-shell';

function profileInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
}

function roleBadgeVariant(roleId: number): 'default' | 'secondary' | 'outline' {
  if (roleId === 2) return 'default';
  return 'secondary';
}

export function TechnicianProfilePage() {
  const navigate = useNavigate();
  const [session, setSession] = useState<SessionUser | null>(() => readTechnicianSession());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    const tech = readTechnicianSession();
    if (!tech) {
      void navigate({ to: '/login' });
      return;
    }
    setSession(tech);

    void getStaffProfileFn({ data: { staffId: tech.staffId } })
      .then((profile) => {
        setFullName(profile.fullName);
        setEmail(profile.email);
        setPhone(profile.phone ?? '');
      })
      .catch((e) => {
        toast.error(e instanceof Error ? e.message : 'Failed to load profile');
        setFullName(tech.fullName);
        setEmail(tech.email);
        setPhone(tech.phone ?? '');
      })
      .finally(() => setLoading(false));
  }, [navigate]);

  const initials = useMemo(() => profileInitials(fullName || session?.fullName || ''), [fullName, session]);

  const handleSignOut = () => {
    clearAllSessions();
    void navigate({ to: '/login' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) return;

    if (password && password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setSaving(true);
    try {
      const updated = await updateStaffProfileFn({
        data: {
          staffId: session.staffId,
          fullName: fullName.trim(),
          email: email.trim(),
          phone: phone.trim() || null,
          password: password || undefined,
        },
      });
      const nextSession: SessionUser = {
        staffId: updated.staffId,
        fullName: updated.fullName,
        email: updated.email,
        roleId: updated.roleId,
        roleName: updated.roleName,
        phone: updated.phone,
      };
      persistSession(nextSession);
      setSession(nextSession);
      setPassword('');
      setConfirmPassword('');
      toast.success('Profile updated');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not update profile');
    } finally {
      setSaving(false);
    }
  };

  if (!session) {
    return (
      <TechnicianShell>
        <p className="py-16 text-center text-sm text-muted-foreground">Loading…</p>
      </TechnicianShell>
    );
  }

  return (
    <TechnicianShell>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">My profile</h1>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            Update your technician account details and password.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="shrink-0 rounded-[8px]"
          onClick={handleSignOut}
        >
          Sign out
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,280px)_1fr]">
        <Card className="h-fit rounded-[14px] border-border shadow-sm lg:sticky lg:top-20">
          <CardContent className="flex flex-col items-center px-6 pb-6 pt-8 text-center">
            <div
              className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-lavender/30 to-[oklch(0.55_0.14_290)]/20 text-2xl font-bold text-[oklch(0.45_0.12_290)] ring-4 ring-background"
              aria-hidden
            >
              {initials}
            </div>
            <h2 className="text-lg font-semibold text-foreground">{fullName || session.fullName}</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">{email || session.email}</p>
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              <Badge variant={roleBadgeVariant(session.roleId)} className="rounded-[6px] capitalize">
                {session.roleName}
              </Badge>
              <Badge variant="outline" className="rounded-[6px] font-mono text-[10px]">
                {session.staffId}
              </Badge>
            </div>
            {phone && (
              <p className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
                <Phone className="h-3.5 w-3.5" />
                {phone}
              </p>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="rounded-[14px] border-border shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <User className="h-4 w-4 text-muted-foreground" />
                Personal details
              </CardTitle>
              <CardDescription>Staff ID is assigned by your administrator and cannot be changed.</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="py-8 text-center text-sm text-muted-foreground">Loading profile…</p>
              ) : (
                <form id="technician-profile-form" onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
                  <FormField label="Staff ID">
                    <div className="relative">
                      <IdCard className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input value={session.staffId} disabled className="rounded-[8px] bg-muted/50 pl-9 font-mono" />
                    </div>
                  </FormField>
                  <FormField label="Full name" required>
                    <div className="relative">
                      <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        required
                        autoComplete="name"
                        className="rounded-[8px] pl-9"
                      />
                    </div>
                  </FormField>
                  <FormField label="Email" required>
                    <div className="relative">
                      <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        autoComplete="email"
                        className="rounded-[8px] pl-9"
                      />
                    </div>
                  </FormField>
                  <FormField label="Phone">
                    <div className="relative">
                      <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        autoComplete="tel"
                        placeholder="Optional"
                        className="rounded-[8px] pl-9"
                      />
                    </div>
                  </FormField>
                </form>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-[14px] border-border shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Shield className="h-4 w-4 text-muted-foreground" />
                Security
              </CardTitle>
              <CardDescription>Leave password fields blank to keep your current password.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField label="New password">
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    minLength={6}
                    autoComplete="new-password"
                    disabled={loading}
                    className="rounded-[8px] pl-9"
                  />
                </div>
              </FormField>
              <FormField label="Confirm new password">
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    minLength={6}
                    autoComplete="new-password"
                    disabled={loading}
                    className="rounded-[8px] pl-9"
                  />
                </div>
              </FormField>
            </CardContent>
          </Card>

          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              type="submit"
              form="technician-profile-form"
              className="rounded-[8px] sm:min-w-[160px]"
              disabled={loading || saving}
            >
              {saving ? 'Saving…' : 'Save changes'}
            </Button>
          </div>
        </div>
      </div>
    </TechnicianShell>
  );
}
