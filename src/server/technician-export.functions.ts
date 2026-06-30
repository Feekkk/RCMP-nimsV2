import { createServerFn } from '@tanstack/react-start';
import type { TechnicianAssetExportKind, TechnicianReportPdfFilters } from '@/lib/technician-export-schema';
import { assertStaffRole } from '@/server/technician-auth.server';

const ASSET_KINDS: TechnicianAssetExportKind[] = ['laptop', 'av', 'network'];

export const exportTechnicianAssetCsvFn = createServerFn({ method: 'POST' })
  .inputValidator((data: { callerRoleId: number; kind: string }) => data)
  .handler(async ({ data }) => {
    assertStaffRole(data.callerRoleId);
    if (!ASSET_KINDS.includes(data.kind as TechnicianAssetExportKind)) {
      throw new Error('Invalid asset type');
    }
    const { exportTechnicianAssetCsv } = await import('@/server/technician-export.server');
    return exportTechnicianAssetCsv(data.kind as TechnicianAssetExportKind);
  });

export const generateAssetReportPdfFn = createServerFn({ method: 'POST' })
  .inputValidator((data: { callerRoleId: number; filters: TechnicianReportPdfFilters }) => data)
  .handler(async ({ data }) => {
    assertStaffRole(data.callerRoleId);
    if (!data.filters.kinds.length) {
      throw new Error('Select at least one asset type');
    }
    const { generateAssetReportPdfBase64 } = await import('@/server/asset-report-pdf.server');
    return generateAssetReportPdfBase64(data.filters);
  });
