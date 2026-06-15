import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Fingerprint, Mail, Phone, User } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { clearAllSessions, readTechnicianSession, type SessionUser } from '@/lib/auth-session';
import { getStaffProfileFn } from '@/server/auth.functions';
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

  const [oid, setOid] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  useEffect(() => {
    const tech = readTechnicianSession();
    if (!tech) {
      void navigate({ to: '/login' });
      return;
    }
    setSession(tech);

    void getStaffProfileFn({ data: { staffId: tech.staffId } })
      .then((profile) => {
        setOid(profile.oid ?? '');
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
            Your details are loaded from Microsoft Entra ID.
          </p>
        </div>
        <Button type="button" variant="outline" className="rounded-[8px]" onClick={handleSignOut}>
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
              <CardDescription>
                Name, email, and phone are read from Azure AD. Contact your administrator to update
                directory information.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="py-8 text-center text-sm text-muted-foreground">Loading profile from Azure…</p>
              ) : (
                <div className="space-y-4">
                  <FormField label="Microsoft OID">
                    <div className="relative">
                      <Fingerprint className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        value={oid || '—'}
                        disabled
                        className="rounded-[8px] bg-muted/50 pl-9 font-mono text-xs"
                      />
                    </div>
                  </FormField>
                  <FormField label="Full name">
                    <div className="relative">
                      <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input value={fullName} disabled className="rounded-[8px] bg-muted/50 pl-9" />
                    </div>
                  </FormField>
                  <FormField label="Email">
                    <div className="relative">
                      <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        type="email"
                        value={email}
                        disabled
                        className="rounded-[8px] bg-muted/50 pl-9"
                      />
                    </div>
                  </FormField>
                  <FormField label="Phone">
                    <div className="relative">
                      <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        type="tel"
                        value={phone}
                        disabled
                        placeholder="—"
                        className="rounded-[8px] bg-muted/50 pl-9"
                      />
                    </div>
                  </FormField>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </TechnicianShell>
  );
}
