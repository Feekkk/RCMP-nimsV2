import { useState } from 'react';
import {
  ArrowRightLeft,
  Building2,
  ClipboardList,
  Contact,
  Download,
  Laptop,
  Loader2,
  Network,
  Tv,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { AdminShell } from '@/admin/admin-shell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { readAdminSession } from '@/lib/auth-session';
import { exportAdminCsvFn } from '@/server/admin-export.functions';
import type { AdminExportKind } from '@/server/admin-export.server';

type ExportOption = {
  kind: AdminExportKind;
  title: string;
  description: string;
  icon: typeof Users;
};

const EXPORT_GROUPS: {
  title: string;
  description: string;
  options: ExportOption[];
}[] = [
  {
    title: 'Operations',
    description: 'Asset handover and facility deployment history, including return details.',
    options: [
      {
        kind: 'handovers',
        title: 'Laptop handovers',
        description: 'Laptop recipients, handlers, locations, and return details',
        icon: ArrowRightLeft,
      },
      {
        kind: 'deployments',
        title: 'AV and network deployments',
        description: 'Facility deployment locations, handlers, and return details',
        icon: Building2,
      },
    ],
  },
  {
    title: 'System data',
    description: 'Accounts, request activity, and the staff directory.',
    options: [
      {
        kind: 'users',
        title: 'Users',
        description: 'All NIMS accounts with role and auth provider',
        icon: Users,
      },
      {
        kind: 'requests',
        title: 'Requests log',
        description: 'Equipment requests with items summary',
        icon: ClipboardList,
      },
      {
        kind: 'staff',
        title: 'Staff directory',
        description: 'RCMP staff directory for handover recipients',
        icon: Contact,
      },
    ],
  },
  {
    title: 'Asset inventory',
    description: 'Full inventory downloads with every column from each asset table.',
    options: [
      {
        kind: 'laptop',
        title: 'Laptop assets',
        description: 'Full laptop inventory export',
        icon: Laptop,
      },
      { kind: 'av', title: 'AV assets', description: 'Full AV inventory export', icon: Tv },
      {
        kind: 'network',
        title: 'Network assets',
        description: 'Full network inventory export',
        icon: Network,
      },
    ],
  },
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

      <div className="space-y-4">
        {EXPORT_GROUPS.map((group) => (
          <Card key={group.title} className="rounded-2xl border-border shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{group.title}</CardTitle>
              <CardDescription>{group.description}</CardDescription>
            </CardHeader>
            <CardContent className="divide-y divide-border p-0">
              {group.options.map(({ kind, title, description, icon: Icon }) => (
                <div key={kind} className="flex items-center gap-4 px-6 py-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-lavender/15 text-[oklch(0.45_0.12_290)]">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">{title}</p>
                    <p className="truncate text-sm text-muted-foreground">{description}</p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="shrink-0 rounded-lg"
                    disabled={loadingKind !== null}
                    onClick={() => void handleExport(kind)}
                  >
                    {loadingKind === kind ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="mr-2 h-4 w-4" />
                    )}
                    Download
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </AdminShell>
  );
}
