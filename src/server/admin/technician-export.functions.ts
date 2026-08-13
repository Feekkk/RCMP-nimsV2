import { createServerFn } from '@tanstack/react-start';
import type { TechnicianAssetExportKind, TechnicianReportPdfFilters } from '@/lib/technician-export-schema';
import { staffMiddleware } from '@/server/core/auth-middleware';

const ASSET_KINDS: TechnicianAssetExportKind[] = ['laptop', 'av', 'network'];

export const exportTechnicianAssetCsvFn = createServerFn({ method: 'POST' })
  .middleware([staffMiddleware])
  .inputValidator((data: { kind: string }) => data)
  .handler(async ({ data }) => {
    if (!ASSET_KINDS.includes(data.kind as TechnicianAssetExportKind)) {
      throw new Error(
        'The asset type is not recognized. Choose Laptop, AV, or Network and try again.',
      );
    }
    const { exportTechnicianAssetCsv } = await import('@/server/admin/technician-export.server');
    return exportTechnicianAssetCsv(data.kind as TechnicianAssetExportKind);
  });

export const generateAssetReportPdfFn = createServerFn({ method: 'POST' })
  .middleware([staffMiddleware])
  .inputValidator((data: { filters: TechnicianReportPdfFilters }) => data)
  .handler(async ({ data }) => {
    if (!data.filters.kinds.length) {
      throw new Error('Select at least one asset type to include in the report.');
    }
    if (!data.filters.columns.length) {
      throw new Error('Select at least one column to include in the report.');
    }
    const { generateAssetReportPdfBase64 } = await import('@/server/pdf/asset-report-pdf.server');
    return generateAssetReportPdfBase64(data.filters);
  });
