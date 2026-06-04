import { useState } from 'react';
import { Download, FileSpreadsheet, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { AdminShell } from '@/admin/admin-shell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { readAdminSession } from '@/lib/auth-session';
import { exportAdminCsvFn } from '@/server/admin-export.functions';
import type { AdminExportKind } from '@/server/admin-export.server';

const EXPORT_OPTIONS: { kind: AdminExportKind; title: string; description: string }[] = [
  { kind: 'users', title: 'Users', description: 'All NIMS accounts with role and auth provider' },
  { kind: 'requests', title: 'Requests log', description: 'Equipment requests with items summary' },
  { kind: 'laptop', title: 'Laptop assets', description: 'Full laptop inventory export' },
  { kind: 'av', title: 'AV assets', description: 'Full AV inventory export' },
  { kind: 'network', title: 'Network assets', description: 'Full network inventory export' },
  { kind: 'staff', title: 'Staff directory', description: 'RCMP staff directory for handover recipients' },
];

function downloadCsv(filename: string, body: string) {
  const blob = new Blob([body], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function AdminExportPage() {
  const [loadingKind, setLoadingKind] = useState<AdminExportKind | null>(null);

  const handleExport = async (kind: AdminExportKind) => {
    const admin = readAdminSession();
    if (!admin) return;
    setLoadingKind(kind);
    try {
      const result = await exportAdminCsvFn({ data: { callerRoleId: admin.roleId, kind } });
      downloadCsv(result.filename, result.body);
      toast.success(`Downloaded ${result.filename}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Export failed');
    } finally {
      setLoadingKind(null);
    }
  };

  return (
    <AdminShell>
      <div className="mb-6">
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Export</h1>
        <p className="text-sm text-muted-foreground">Download system data as CSV for reporting</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {EXPORT_OPTIONS.map(({ kind, title, description }) => (
          <Card key={kind} className="rounded-2xl border-border shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-lavender/15 text-[oklch(0.45_0.12_290)]">
                  <FileSpreadsheet className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <CardTitle className="text-base">{title}</CardTitle>
                  <CardDescription>{description}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Button
                type="button"
                variant="outline"
                className="w-full rounded-lg"
                disabled={loadingKind !== null}
                onClick={() => void handleExport(kind)}
              >
                {loadingKind === kind ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Download className="mr-2 h-4 w-4" />
                )}
                Download CSV
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </AdminShell>
  );
}
