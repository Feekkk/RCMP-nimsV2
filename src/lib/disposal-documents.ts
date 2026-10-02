import JSZip from 'jszip';
import type { DisposalReport } from '@shared/lib/disposal-schema';
import { disposalDownloadStem } from '@shared/lib/disposal-photo';
import { downloadBlob } from '@/lib/download-blob';
import { buildDisposalLampiran1 } from '@/lib/disposal-lampiran1-workbook';
import { buildDisposalLampiran2 } from '@/lib/disposal-lampiran2-document';
import { buildDisposalTpa10 } from '@/lib/disposal-tpa10-document';
import { logDisposalFormDownloadFn } from '@backend/server/assets/assets.functions';

type DisposalFile = { blob: Blob; fileName: string };
type DisposalFormName = 'lampiran1' | 'lampiran2' | 'tpa10';

async function recordDisposalFormDownload(noRujukanPelupusan: string, form: DisposalFormName) {
  try {
    await logDisposalFormDownloadFn({ data: { noRujukanPelupusan, form } });
  } catch {
    return;
  }
}

async function saveDisposalFile(report: DisposalReport, form: DisposalFormName, file: DisposalFile | null) {
  if (!file) return;
  await recordDisposalFormDownload(report.noRujukanPelupusan, form);
  downloadBlob(file.blob, file.fileName);
}

export async function downloadDisposalLampiran1(report: DisposalReport) {
  await saveDisposalFile(report, 'lampiran1', await buildDisposalLampiran1(report));
}

export async function downloadDisposalLampiran2(report: DisposalReport) {
  await saveDisposalFile(report, 'lampiran2', await buildDisposalLampiran2(report));
}

export async function downloadDisposalTpa10(report: DisposalReport) {
  await saveDisposalFile(report, 'tpa10', await buildDisposalTpa10(report));
}

export async function downloadDisposalBundle(report: DisposalReport) {
  const [lampiran1, lampiran2, tpa10] = await Promise.all([
    buildDisposalLampiran1(report),
    buildDisposalLampiran2(report),
    buildDisposalTpa10(report),
  ]);
  const files = [lampiran1, lampiran2, tpa10].filter((file): file is DisposalFile => file != null);
  if (files.length === 0) throw new Error('There are no disposal forms to download.');
  await Promise.all([
    lampiran1 ? recordDisposalFormDownload(report.noRujukanPelupusan, 'lampiran1') : Promise.resolve(),
    lampiran2 ? recordDisposalFormDownload(report.noRujukanPelupusan, 'lampiran2') : Promise.resolve(),
    tpa10 ? recordDisposalFormDownload(report.noRujukanPelupusan, 'tpa10') : Promise.resolve(),
  ]);
  const zip = new JSZip();
  for (const file of files) zip.file(file.fileName, file.blob);
  downloadBlob(
    await zip.generateAsync({ type: 'blob' }),
    `Disposal forms - ${disposalDownloadStem(report.noRujukanPelupusan)}.zip`,
  );
}
