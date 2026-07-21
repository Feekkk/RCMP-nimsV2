import { createServerFn } from '@tanstack/react-start';
import type { AdminExportKind } from '@/server/admin-export.server';
import { assertAdminRole } from '@/server/admin-auth.server';

const KINDS: AdminExportKind[] = [
  'users',
  'requests',
  'laptop',
  'av',
  'network',
  'staff',
  'handovers',
  'deployments',
];

export const exportAdminCsvFn = createServerFn({ method: 'POST' })
  .inputValidator((data: { callerRoleId: number; kind: string }) => data)
  .handler(async ({ data }) => {
    assertAdminRole(data.callerRoleId);
    if (!KINDS.includes(data.kind as AdminExportKind)) {
      throw new Error('The export type is not recognized. Choose a valid export option and try again.');
    }
    const { exportAdminCsv } = await import('@/server/admin-export.server');
    return exportAdminCsv(data.kind as AdminExportKind);
  });
