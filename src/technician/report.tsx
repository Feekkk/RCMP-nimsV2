import { useMemo, useState } from 'react';
import { Download, FileBarChart, FileSpreadsheet, FileText, Laptop, Loader2, Network, Tv } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { AssetKind } from '@/lib/inventory-schema';
import { ASSET_KIND_LABEL, INVENTORY_STATUSES, formatStatusLabel } from '@/lib/inventory-schema';
import { readTechnicianSession } from '@/lib/auth-session';
import type {
  TechnicianAssetExportKind,
  TechnicianReportPdfFilters,
  TechnicianReportRequestFilter,
  ReportPdfColumn,
} from '@/lib/technician-export-schema';
import {
  DEFAULT_REPORT_PDF_COLUMNS,
  REPORT_PDF_COLUMNS,
} from '@/lib/technician-export-schema';
import { downloadCsvFile } from '@/hooks/bulkImport';
import {
  exportTechnicianAssetCsvFn,
  generateAssetReportPdfFn,
} from '@/server/technician-export.functions';
import { TechnicianShell } from '@/technician/technician-shell';

const CSV_EXPORTS: {
  kind: TechnicianAssetExportKind;
  title: string;
  description: string;
  icon: typeof Laptop;
}[] = [
  {
    kind: 'laptop',
    title: 'Laptop / Desktop',
    description: 'Full laptop and desktop inventory export',
    icon: Laptop,
  },
  {
    kind: 'av',
    title: 'AV equipment',
    description: 'Full AV inventory export',
    icon: Tv,
  },
  {
    kind: 'network',
    title: 'Network equipment',
    description: 'Full network inventory export',
    icon: Network,
  },
];

const ALL_KINDS: AssetKind[] = ['laptop', 'av', 'network'];
const ALL_STATUS_IDS = INVENTORY_STATUSES.map((s) => s.statusId);
const ALL_COLUMN_KEYS = REPORT_PDF_COLUMNS.map((c) => c.key);

function downloadPdfFromBase64(base64: string, filename: string) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const blob = new Blob([bytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function TechnicianReportPage() {
  const [csvLoading, setCsvLoading] = useState<TechnicianAssetExportKind | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [selectedKinds, setSelectedKinds] = useState<AssetKind[]>(ALL_KINDS);
  const [selectedStatusIds, setSelectedStatusIds] = useState<number[]>(ALL_STATUS_IDS);
  const [selectedColumns, setSelectedColumns] = useState<ReportPdfColumn[]>(DEFAULT_REPORT_PDF_COLUMNS);
  const [requestFilter, setRequestFilter] = useState<TechnicianReportRequestFilter>('all');

  const allKindsSelected = selectedKinds.length === ALL_KINDS.length;
  const allStatusesSelected = selectedStatusIds.length === ALL_STATUS_IDS.length;
  const allColumnsSelected = selectedColumns.length === ALL_COLUMN_KEYS.length;

  const pdfFilters = useMemo<TechnicianReportPdfFilters>(
    () => ({
      kinds: selectedKinds,
      statusIds: allStatusesSelected ? [] : selectedStatusIds,
      requestFilter,
      columns: selectedColumns,
    }),
    [selectedKinds, selectedStatusIds, allStatusesSelected, requestFilter, selectedColumns],
  );

  const toggleKind = (kind: AssetKind, checked: boolean) => {
    setSelectedKinds((prev) => {
      if (checked) return prev.includes(kind) ? prev : [...prev, kind];
      const next = prev.filter((k) => k !== kind);
      return next.length ? next : prev;
    });
  };

  const toggleStatus = (statusId: number, checked: boolean) => {
    setSelectedStatusIds((prev) => {
      if (checked) return prev.includes(statusId) ? prev : [...prev, statusId];
      const next = prev.filter((id) => id !== statusId);
      return next.length ? next : prev;
    });
  };

  const toggleColumn = (column: ReportPdfColumn, checked: boolean) => {
    setSelectedColumns((prev) => {
      if (checked) return prev.includes(column) ? prev : [...prev, column];
      const next = prev.filter((key) => key !== column);
      return next.length ? next : prev;
    });
  };

  const handleCsvExport = async (kind: TechnicianAssetExportKind) => {
    const tech = readTechnicianSession();
    if (!tech) return;
    setCsvLoading(kind);
    try {
      const result = await exportTechnicianAssetCsvFn({ data: { callerRoleId: tech.roleId, kind } });
      downloadCsvFile(result.filename, result.body);
      toast.success(`Downloaded ${result.filename}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'CSV export failed');
    } finally {
      setCsvLoading(null);
    }
  };

  const handlePdfExport = async () => {
    const tech = readTechnicianSession();
    if (!tech) return;
    if (!selectedKinds.length) {
      toast.error('Select at least one asset type');
      return;
    }
    if (!selectedColumns.length) {
      toast.error('Select at least one report column');
      return;
    }
    setPdfLoading(true);
    try {
      const result = await generateAssetReportPdfFn({
        data: { callerRoleId: tech.roleId, filters: pdfFilters },
      });
      downloadPdfFromBase64(result.base64, result.filename);
      toast.success(`Downloaded ${result.filename} (${result.count} assets)`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'PDF export failed');
    } finally {
      setPdfLoading(false);
    }
  };

  return (
    <TechnicianShell>
      <div className="mb-6">
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Report</h1>
        <p className="text-sm text-muted-foreground">
          Export full asset data as CSV or generate a filtered inventory PDF.
        </p>
      </div>

      <section className="mb-8">
        <div className="mb-4 flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5 text-[oklch(0.45_0.12_290)]" />
          <div>
            <h2 className="text-base font-semibold">CSV export</h2>
            <p className="text-sm text-muted-foreground">Download all columns for each asset table.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {CSV_EXPORTS.map(({ kind, title, description, icon: Icon }) => (
            <Card key={kind} className="rounded-2xl border-border shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-lavender/15 text-[oklch(0.45_0.12_290)]">
                    <Icon className="h-5 w-5" />
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
                  disabled={csvLoading !== null}
                  onClick={() => void handleCsvExport(kind)}
                >
                  {csvLoading === kind ? (
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
      </section>

      <section>
        <div className="mb-4 flex items-center gap-2">
          <FileBarChart className="h-5 w-5 text-[oklch(0.45_0.12_290)]" />
          <div>
            <h2 className="text-base font-semibold">PDF report</h2>
            <p className="text-sm text-muted-foreground">
              Generate a printable inventory report with status and request filters.
            </p>
          </div>
        </div>

        <Card className="rounded-2xl border-border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Report filters</CardTitle>
            <CardDescription>
              Narrow the PDF by asset type, status, request scope, and which columns to include.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <Label className="text-sm font-medium">Asset types</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => setSelectedKinds(allKindsSelected ? [ALL_KINDS[0]] : ALL_KINDS)}
                >
                  {allKindsSelected ? 'Clear to one' : 'Select all'}
                </Button>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {ALL_KINDS.map((kind) => (
                  <label
                    key={kind}
                    className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm"
                  >
                    <Checkbox
                      checked={selectedKinds.includes(kind)}
                      onCheckedChange={(checked) => toggleKind(kind, checked === true)}
                    />
                    {ASSET_KIND_LABEL[kind]}
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <Label className="text-sm font-medium">Asset status</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() =>
                    setSelectedStatusIds(allStatusesSelected ? [ALL_STATUS_IDS[0]] : ALL_STATUS_IDS)
                  }
                >
                  {allStatusesSelected ? 'Clear to one' : 'Select all'}
                </Button>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {INVENTORY_STATUSES.map((status) => (
                  <label
                    key={status.statusId}
                    className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm"
                  >
                    <Checkbox
                      checked={selectedStatusIds.includes(status.statusId)}
                      onCheckedChange={(checked) => toggleStatus(status.statusId, checked === true)}
                    />
                    {formatStatusLabel(status.statusId)}
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <Label className="text-sm font-medium">Report columns</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() =>
                    setSelectedColumns(
                      allColumnsSelected ? [DEFAULT_REPORT_PDF_COLUMNS[0]] : ALL_COLUMN_KEYS,
                    )
                  }
                >
                  {allColumnsSelected ? 'Clear to one' : 'Select all'}
                </Button>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {REPORT_PDF_COLUMNS.map((column) => (
                  <label
                    key={column.key}
                    className="flex items-start gap-2 rounded-lg border border-border px-3 py-2 text-sm"
                  >
                    <Checkbox
                      className="mt-0.5"
                      checked={selectedColumns.includes(column.key)}
                      onCheckedChange={(checked) => toggleColumn(column.key, checked === true)}
                    />
                    <span>
                      <span className="font-medium">{column.label}</span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">{column.description}</span>
                    </span>
                  </label>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Deploy exports use Handled by / Handover to. In-stock exports use History.
                Request is optional for borrow-request assets only.
              </p>
            </div>

            <div className="space-y-2 max-w-sm">
              <Label htmlFor="request-filter">Request filter</Label>
              <Select
                value={requestFilter}
                onValueChange={(value) => setRequestFilter(value as TechnicianReportRequestFilter)}
              >
                <SelectTrigger id="request-filter" className="rounded-lg">
                  <SelectValue placeholder="Choose request filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All assets</SelectItem>
                  <SelectItem value="request-only">Request-related only</SelectItem>
                  <SelectItem value="non-request">Non-request only</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Request-related assets are in request flow statuses or linked to an open user request.
              </p>
            </div>

            <Button
              type="button"
              className="rounded-lg"
              disabled={pdfLoading || !selectedKinds.length || !selectedColumns.length}
              onClick={() => void handlePdfExport()}
            >
              {pdfLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <FileText className="mr-2 h-4 w-4" />
              )}
              Generate PDF
            </Button>
          </CardContent>
        </Card>
      </section>
    </TechnicianShell>
  );
}
