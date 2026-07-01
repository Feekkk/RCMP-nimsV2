import { useEffect, useState } from 'react';
import { Loader2, Settings2 } from 'lucide-react';
import { toast } from 'sonner';
import { AdminShell } from '@/admin/admin-shell';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { readAdminSession } from '@/lib/auth-session';
import { getLoginMaintenanceModeFn, setLoginMaintenanceModeFn } from '@/server/system-settings.functions';

export function AdminSettingsPage() {
  const [maintenanceEnabled, setMaintenanceEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void getLoginMaintenanceModeFn()
      .then(({ enabled }) => setMaintenanceEnabled(enabled))
      .catch((e) => {
        toast.error(e instanceof Error ? e.message : 'Could not load settings');
      })
      .finally(() => setLoading(false));
  }, []);

  const handleMaintenanceToggle = async (enabled: boolean) => {
    const admin = readAdminSession();
    if (!admin) return;

    const previous = maintenanceEnabled;
    setMaintenanceEnabled(enabled);
    setSaving(true);
    try {
      await setLoginMaintenanceModeFn({ data: { callerRoleId: admin.roleId, enabled } });
      toast.success(enabled ? 'Login blocked — maintenance mode is on' : 'Login restored');
    } catch (e) {
      setMaintenanceEnabled(previous);
      toast.error(e instanceof Error ? e.message : 'Could not update setting');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminShell>
      <div className="mb-6">
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Setting</h1>
        <p className="text-sm text-muted-foreground">System-wide configuration for administrators</p>
      </div>

      <Card className="rounded-2xl border-border shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-lavender/15 text-[oklch(0.45_0.12_290)]">
              <Settings2 className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-base">Login maintenance</CardTitle>
              <CardDescription>
                When enabled, the sign-in page shows a maintenance message and new sign-ins are blocked.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading settings…
            </div>
          ) : (
            <div className="flex items-center justify-between gap-4 rounded-xl border border-border/60 bg-secondary/30 px-4 py-3">
              <div className="space-y-0.5">
                <Label htmlFor="login-maintenance" className="text-sm font-medium">
                  Block login page
                </Label>
                <p className="text-xs text-muted-foreground">
                  {maintenanceEnabled
                    ? 'Users see “System under maintenance” on the login page.'
                    : 'Sign-in is available to all users.'}
                </p>
              </div>
              <Switch
                id="login-maintenance"
                checked={maintenanceEnabled}
                disabled={saving}
                onCheckedChange={(checked) => void handleMaintenanceToggle(checked)}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </AdminShell>
  );
}
